import React, { useState, useMemo } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS, db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Dialogue, Quest } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import DialogueForm from './DialogueForm';
import './DialogueList.css';

/**
 * Dialogue tree node structure
 */
interface DialogueTreeNode {
  prefix: string; // e.g., "chen", "walsh"
  rootDialogues: Dialogue[]; // Only root dialogues (not referenced by other dialogues)
}

/**
 * Complete dialogue chain structure
 */
interface DialogueChain {
  root: Dialogue;
  nodes: Map<string, Dialogue>;
  depth: number;
}

export default function DialogueList() {
  const { data: dialogues, loading, error, refresh, remove, update } = useCollection<Dialogue>(
    COLLECTIONS.DIALOGUE
  );
  const { data: quests } = useCollection<Quest>(COLLECTIONS.QUEST);
  const [selectedChain, setSelectedChain] = useState<DialogueChain | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDialogue, setSelectedDialogue] = useState<Dialogue | null>(null);
  const [expandedTrees, setExpandedTrees] = useState<Set<string>>(new Set());
  const [loadingChain, setLoadingChain] = useState(false);

  /**
   * Get quest by ID
   */
  const getQuestById = (questId: string): Quest | undefined => {
    return quests.find((q) => q.id === questId);
  };

  /**
   * Get display name for a quest
   */
  const getQuestName = (quest: Quest): string => {
    return quest.Title || quest.id || 'Unnamed Quest';
  };

  /**
   * Find all dialogue IDs that are referenced by other dialogues
   */
  const referencedDialogueIds = useMemo(() => {
    const referenced = new Set<string>();
    dialogues.forEach((dialogue) => {
      if (dialogue.Paths) {
        Object.values(dialogue.Paths).forEach((nextId) => {
          if (nextId && nextId !== '') {
            referenced.add(nextId);
          }
        });
      }
    });
    return referenced;
  }, [dialogues]);

  /**
   * Group dialogues by their tree prefix, showing only root dialogues
   */
  const dialogueTrees = useMemo(() => {
    const treeMap = new Map<string, Dialogue[]>();

    dialogues.forEach((dialogue) => {
      // Only include root dialogues (not referenced by other dialogues)
      if (!referencedDialogueIds.has(dialogue.id!)) {
        // Extract prefix from treeId (e.g., "chen_welcome" -> "chen")
        const prefix = dialogue.treeId?.split('_')[0] || 'uncategorized';

        if (!treeMap.has(prefix)) {
          treeMap.set(prefix, []);
        }
        treeMap.get(prefix)!.push(dialogue);
      }
    });

    // Convert to array and sort by prefix
    return Array.from(treeMap.entries())
      .map(([prefix, rootDialogues]) => ({
        prefix,
        rootDialogues: rootDialogues.sort((a, b) => (a.treeId || '').localeCompare(b.treeId || '')),
      }))
      .sort((a, b) => a.prefix.localeCompare(b.prefix));
  }, [dialogues, referencedDialogueIds]);

  /**
   * Fetch complete dialogue chain starting from a root dialogue
   */
  const fetchDialogueChain = async (rootDialogue: Dialogue): Promise<DialogueChain> => {
    const nodes = new Map<string, Dialogue>();
    const visited = new Set<string>();
    const toProcess: string[] = [rootDialogue.id!];
    let maxDepth = 0;

    nodes.set(rootDialogue.id!, rootDialogue);

    // Breadth-first traversal to fetch all connected dialogues
    while (toProcess.length > 0) {
      const currentId = toProcess.shift()!;

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const dialogue = nodes.get(currentId) || (await fetchDialogueNode(currentId));

      if (!dialogue) {
        console.warn(`Dialogue node not found: ${currentId}`);
        continue;
      }

      nodes.set(currentId, dialogue);

      // Add all path targets to processing queue
      if (dialogue.Paths) {
        for (const nextId of Object.values(dialogue.Paths)) {
          if (nextId && nextId !== '' && !visited.has(nextId)) {
            toProcess.push(nextId);
            maxDepth = Math.max(maxDepth, visited.size);
          }
        }
      }
    }

    return {
      root: rootDialogue,
      nodes,
      depth: maxDepth,
    };
  };

  /**
   * Fetch a single dialogue node from Firestore
   */
  const fetchDialogueNode = async (dialogueId: string): Promise<Dialogue | null> => {
    try {
      const docRef = doc(db, COLLECTIONS.DIALOGUE, dialogueId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Dialogue;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching dialogue node ${dialogueId}:`, error);
      return null;
    }
  };

  const toggleTree = (prefix: string) => {
    const newExpanded = new Set(expandedTrees);
    if (newExpanded.has(prefix)) {
      newExpanded.delete(prefix);
    } else {
      newExpanded.add(prefix);
    }
    setExpandedTrees(newExpanded);
  };

  const handleViewChain = async (rootDialogue: Dialogue) => {
    setLoadingChain(true);
    try {
      const chain = await fetchDialogueChain(rootDialogue);
      setSelectedChain(chain);
      setIsDetailModalOpen(true);
    } catch (error) {
      alert('Error loading dialogue chain: ' + (error as Error).message);
    } finally {
      setLoadingChain(false);
    }
  };

  const handleEdit = (dialogue: Dialogue) => {
    setSelectedDialogue(dialogue);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (dialogue: Dialogue) => {
    if (window.confirm(`Are you sure you want to delete dialogue "${dialogue.id}"?\n\nThis will also remove all references to this dialogue from parent nodes.`)) {
      try {
        // Find all dialogues that reference this dialogue in their Paths
        const parentDialogues = dialogues.filter((d) => {
          if (!d.Paths) return false;
          return Object.values(d.Paths).includes(dialogue.id!);
        });

        // Update parent dialogues to remove references
        for (const parent of parentDialogues) {
          const updatedPaths = { ...parent.Paths };
          // Remove all path entries that point to the deleted dialogue
          Object.keys(updatedPaths).forEach((key) => {
            if (updatedPaths[key] === dialogue.id) {
              delete updatedPaths[key];
            }
          });
          await update(parent.id!, { Paths: updatedPaths });
        }

        // Delete the dialogue
        await remove(dialogue.id!);
        alert(`Dialogue deleted successfully. Updated ${parentDialogues.length} parent dialogue(s).`);

        // Refresh the list and close modals
        refresh();
        handleCloseModals();
      } catch (err) {
        alert('Failed to delete dialogue: ' + (err as Error).message);
      }
    }
  };

  const handleCloseModals = () => {
    setIsDetailModalOpen(false);
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedDialogue(null);
    setSelectedChain(null);
  };

  const handleFormSuccess = () => {
    handleCloseModals();
    refresh();
  };

  /**
   * Get a display name for a dialogue (first 50 chars of content or treeId)
   */
  const getDialogueName = (dialogue: Dialogue): string => {
    if (dialogue.content && dialogue.content.trim()) {
      const content = dialogue.content.trim();
      return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
    return dialogue.treeId || dialogue.id || 'Unnamed dialogue';
  };

  /**
   * Recursively render dialogue chain nodes
   */
  const renderDialogueChainNode = (
    dialogue: Dialogue,
    allNodes: Map<string, Dialogue>,
    depth: number,
    visited: Set<string>
  ): JSX.Element | null => {
    if (!dialogue || visited.has(dialogue.id!)) {
      return null;
    }

    visited.add(dialogue.id!);

    const hasChildren = dialogue.Paths && Object.keys(dialogue.Paths).length > 0;
    const isEndNode = !hasChildren;
    const dialogueName = getDialogueName(dialogue);

    return (
      <div key={dialogue.id} className="dialogue-chain-node" style={{ marginLeft: `${depth * 20}px` }}>
        <div className={`dialogue-chain-node-card ${isEndNode ? 'dialogue-chain-node-end' : ''}`}>
          <div className="dialogue-chain-node-header">
            <div className="dialogue-chain-node-header-left">
              <span className="dialogue-chain-node-name">
                {dialogueName}
              </span>
              <span className="dialogue-chain-node-id-small">
                ({dialogue.treeId || dialogue.id})
              </span>
              {isEndNode && <span className="dialogue-chain-node-badge">END</span>}
              {dialogue.TriggeredQuest && (() => {
                const quest = getQuestById(dialogue.TriggeredQuest);
                return quest ? (
                  <span className="dialogue-chain-node-quest" title={`Quest: ${getQuestName(quest)}`}>
                    ⚡ {getQuestName(quest)} <span className="dialogue-chain-node-quest-id">({quest.id})</span>
                  </span>
                ) : (
                  <span className="dialogue-chain-node-quest-missing">⚡ Missing: {dialogue.TriggeredQuest}</span>
                );
              })()}
            </div>
            <div className="dialogue-chain-node-actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleEdit(dialogue)}
              >
                ✏️ Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDelete(dialogue)}
              >
                🗑️ Delete
              </Button>
            </div>
          </div>

          <div className="dialogue-chain-node-content">
            {dialogue.content}
          </div>

          {hasChildren && (
            <div className="dialogue-chain-node-paths">
              <div className="dialogue-chain-paths-label">Player Options:</div>
              {Object.entries(dialogue.Paths).map(([optionText, nextId], index) => {
                const nextDialogue = allNodes.get(nextId);
                return (
                  <div key={index} className="dialogue-chain-path">
                    <div className="dialogue-chain-path-option">
                      <span className="dialogue-chain-path-arrow">→</span>
                      <span className="dialogue-chain-path-text">{optionText}</span>
                      {nextDialogue && (
                        <button
                          className="dialogue-chain-path-link"
                          onClick={() => handleEdit(nextDialogue)}
                          title={`Edit: ${getDialogueName(nextDialogue)}`}
                        >
                          🔗 {getDialogueName(nextDialogue)}
                        </button>
                      )}
                      {!nextDialogue && nextId && (
                        <span className="dialogue-chain-path-missing-inline">
                          ⚠️ Missing: {nextId}
                        </span>
                      )}
                    </div>
                    {nextDialogue && renderDialogueChainNode(nextDialogue, allNodes, depth + 1, new Set(visited))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <Card title="Dialogues">
        <div className="error-message">
          <p>Error loading dialogues: {error.message}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Dialogue Trees"
        actions={
          <>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              ➕ Create Dialogue
            </Button>
            <Button onClick={refresh} size="sm" variant="secondary">
              🔄 Refresh
            </Button>
          </>
        }
      >
        {loading ? (
          <div className="dialogue-loading">Loading dialogues...</div>
        ) : dialogueTrees.length === 0 ? (
          <div className="dialogue-empty">No dialogues found. Create your first dialogue!</div>
        ) : (
          <div className="dialogue-tree-container">
            {dialogueTrees.map((tree) => (
              <div key={tree.prefix} className="dialogue-tree">
                {/* Tree Header */}
                <div
                  className="dialogue-tree-header"
                  onClick={() => toggleTree(tree.prefix)}
                >
                  <div className="dialogue-tree-header-left">
                    <span className="dialogue-tree-icon">
                      {expandedTrees.has(tree.prefix) ? '▼' : '▶'}
                    </span>
                    <span className="dialogue-tree-prefix">{tree.prefix}</span>
                    <span className="dialogue-tree-count">
                      ({tree.rootDialogues.length} conversation{tree.rootDialogues.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                {/* Tree Content (Expanded) */}
                {expandedTrees.has(tree.prefix) && (
                  <div className="dialogue-tree-content">
                    {tree.rootDialogues.map((dialogue) => (
                      <div key={dialogue.id} className="dialogue-tree-item">
                        <div className="dialogue-tree-item-main">
                          <div className="dialogue-tree-item-info">
                            <div className="dialogue-tree-item-id">
                              🗨️ {dialogue.treeId || dialogue.id}
                            </div>
                            <div className="dialogue-tree-item-preview">
                              {dialogue.content?.substring(0, 80) || 'No content'}
                              {dialogue.content && dialogue.content.length > 80 ? '...' : ''}
                            </div>
                            <div className="dialogue-tree-item-meta">
                              <span className="dialogue-tree-item-paths">
                                {Object.keys(dialogue.Paths || {}).length} path(s)
                              </span>
                              {dialogue.TriggeredQuest && (() => {
                                const quest = getQuestById(dialogue.TriggeredQuest);
                                return quest ? (
                                  <span className="dialogue-tree-item-quest" title={`Quest: ${getQuestName(quest)}`}>
                                    ⚡ {getQuestName(quest)}
                                  </span>
                                ) : (
                                  <span className="dialogue-tree-item-quest-missing">
                                    ⚡ Missing: {dialogue.TriggeredQuest}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="dialogue-tree-item-actions">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleViewChain(dialogue)}
                              disabled={loadingChain}
                            >
                              🔗 View Chain
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEdit(dialogue)}
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(dialogue)}
                            >
                              🗑️ Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detail Modal - Dialogue Chain View */}
      {selectedChain && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModals}
          title={`Dialogue Chain: ${selectedChain.root.treeId || selectedChain.root.id}`}
          size="xl"
        >
          <div className="dialogue-chain-view">
            <div className="dialogue-chain-header">
              <div className="dialogue-chain-stat">
                <span className="dialogue-chain-stat-label">Total Nodes:</span>
                <span className="dialogue-chain-stat-value">{selectedChain.nodes.size}</span>
              </div>
              <div className="dialogue-chain-stat">
                <span className="dialogue-chain-stat-label">Max Depth:</span>
                <span className="dialogue-chain-stat-value">{selectedChain.depth}</span>
              </div>
            </div>

            <div className="dialogue-chain-nodes">
              {renderDialogueChainNode(selectedChain.root, selectedChain.nodes, 0, new Set())}
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        title="Create New Dialogue"
        size="xl"
      >
        <DialogueForm onSuccess={handleFormSuccess} onCancel={handleCloseModals} />
      </Modal>

      {/* Edit Modal */}
      {selectedDialogue && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseModals}
          title={`Edit Dialogue: ${selectedDialogue.id}`}
          size="xl"
        >
          <DialogueForm
            dialogue={selectedDialogue}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModals}
          />
        </Modal>
      )}
    </>
  );
}

