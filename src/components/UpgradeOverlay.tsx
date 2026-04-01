import type { UpgradeDefinition } from "../game/upgrades";
import type { UpgradeDraftSource } from "../game/types";

interface Props {
  offers: Pick<UpgradeDefinition, "id" | "label" | "rarity">[];
  source: UpgradeDraftSource;
  onSelect: (upgradeId: string) => void;
}

const SOURCE_COPY: Record<UpgradeDraftSource, string> = {
  normal: "Segment Draft",
  elite: "Elite Draft",
  collapseBonus: "Collapse Bonus"
};

export function UpgradeOverlay({ offers, source, onSelect }: Props) {
  return (
    <div className="overlay draft-overlay">
      <div className="overlay-card upgrade-overlay-card">
        <p className="overlay-eyebrow">{SOURCE_COPY[source]}</p>
        <h2>Choose your next candy mod</h2>
        <p>Press 1, 2, or 3 to lock in an upgrade, or click a card below.</p>
        <div className="upgrade-options">
          {offers.map((offer, index) => (
            <button
              key={offer.id}
              type="button"
              className={`upgrade-card rarity-${offer.rarity}`}
              onClick={() => onSelect(offer.id)}
            >
              <span className="upgrade-card-top">
                <span className="upgrade-key">{index + 1}</span>
                <span className="upgrade-rarity">{offer.rarity}</span>
              </span>
              <strong>{offer.label}</strong>
              <span className="upgrade-id">{offer.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
