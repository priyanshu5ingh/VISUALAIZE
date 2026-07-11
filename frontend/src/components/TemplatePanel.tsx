// frontend/src/components/TemplatePanel.tsx
// Issue #291: The "Start from Template" UI panel shown in Zero State

import { useState } from "react";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  type DiagramTemplate,
  type TemplateCategory,
} from "../utils/templates";

interface TemplatePanelProps {
  /** Called when user picks a template to load into GraphEditor */
  onSelectTemplate: (template: DiagramTemplate) => void;
}

export function TemplatePanel({ onSelectTemplate }: TemplatePanelProps) {
  const [activeCategory, setActiveCategory] =
    useState<TemplateCategory>("Flowchart");

  const filtered = getTemplatesByCategory(activeCategory);

  return (
    <div className="template-panel">
      {/* Panel header */}
      <h3 className="template-panel__title">📐 Start from a Template</h3>
      <p className="template-panel__subtitle">
        Pick a skeleton — then refine it with Gemini or edit manually.
      </p>

      {/* Category tabs */}
      <div className="template-panel__tabs">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`template-panel__tab ${
              activeCategory === cat ? "template-panel__tab--active" : ""
            }`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template cards */}
      <div className="template-panel__grid">
        {filtered.map((template) => (
          <div
            key={template.id}
            className="template-card"
            onClick={() => onSelectTemplate(template)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectTemplate(template);
              }
            }}
          >
            <div className="template-card__name">{template.name}</div>
            <div className="template-card__desc">{template.description}</div>
            <div className="template-card__meta">
              {template.nodes.length} nodes · {template.edges.length} edges
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}