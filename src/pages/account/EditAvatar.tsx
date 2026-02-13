import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAvatar } from "@dicebear/core";
import { DICEBEAR_STYLE_LABELS, DICEBEAR_STYLES, type DicebearStyleId } from "../../avatars/dicebear_registry";
import { AVATAR_STYLE_ORDER, getNextStyle } from "../../avatars/styleList";
import { randomSeed } from "../../utils/random";
import { useProfile } from "../../features/profile/ProfileContext";
import "../../styles/auth-onboarding.css";

export default function EditAvatar() {
  const profile = useProfile();
  const navigate = useNavigate();

  const initialDraftStyle = profile.profileDraft.avatar.style as DicebearStyleId | undefined;
  const initialStyle =
    initialDraftStyle && AVATAR_STYLE_ORDER.includes(initialDraftStyle)
      ? initialDraftStyle
      : (AVATAR_STYLE_ORDER[0]! as DicebearStyleId);

  const [style, setStyle] = useState<DicebearStyleId>(initialStyle);
  const [seed, setSeed] = useState(profile.profileDraft.avatar.seed);
  const baseSeedRef = useRef(seed);
  const [, setSeedOffset] = useState(0);

  const svg = useMemo(() => createAvatar(DICEBEAR_STYLES[style], { seed }).toString(), [seed, style]);
  const dataUrl = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  const styleLabel = DICEBEAR_STYLE_LABELS[style] ?? style;

  function handleSave() {
    profile.setProfileDraft({ avatar: { style, seed } });
    navigate("/account");
  }

  return (
    <div className="account-overlay">
      <div className="account-container">
        <h1 className="account-heading">Edit Avatar</h1>
        <p className="account-description">
          Customize your avatar. Style: {styleLabel}
        </p>

        <div className="avatar-preview-wrapper">
          <img
            src={dataUrl}
            alt="Avatar preview"
            className="avatar-preview"
          />

          <div className="avatar-info">
            <div className="avatar-info-label">Style</div>
            <div className="avatar-info-value">{style}</div>
          </div>

          <div className="avatar-info">
            <div className="avatar-info-label">Seed</div>
            <div className="avatar-info-value">{seed}</div>
          </div>
        </div>

        <div className="account-actions" style={{ marginTop: 20 }}>
          <div className="button-group-inline">
            <button
              type="button"
              onClick={() => {
                if (AVATAR_STYLE_ORDER.length > 1) {
                  const prevStyle = getNextStyle(style, -1);
                  setStyle(prevStyle);
                  return;
                }
                setSeedOffset((prev) => {
                  const next = prev - 1;
                  const newSeed = `${baseSeedRef.current}:${next}`;
                  setSeed(newSeed);
                  return next;
                });
              }}
              className="btn btn-secondary"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() => {
                if (AVATAR_STYLE_ORDER.length > 1) {
                  const nextStyle = getNextStyle(style, +1);
                  setStyle(nextStyle);
                  return;
                }
                setSeedOffset((prev) => {
                  const next = prev + 1;
                  const newSeed = `${baseSeedRef.current}:${next}`;
                  setSeed(newSeed);
                  return next;
                });
              }}
              className="btn btn-secondary"
            >
              Next
            </button>

            <button
              type="button"
              onClick={() => {
                const next = randomSeed();
                baseSeedRef.current = next;
                setSeedOffset(0);
                setSeed(next);
              }}
              className="btn btn-secondary"
            >
              New Seed
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Changes
          </button>

          <button
            type="button"
            onClick={() => navigate("/account")}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
