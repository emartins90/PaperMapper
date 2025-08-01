import React from "react";
import ResourceCard from "./ResourceCard";

interface Resource {
  url: string;
  title?: string;
  description?: string;
  category: string;
}

interface ResourceSectionProps {
  title: string;
  resources: Resource[];
}

export default function ResourceSection({ title, resources }: ResourceSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-md font-semibold text-gray-900">{title}</h3>
      <div className="space-y-2">
        {resources.map((resource, index) => (
          <ResourceCard
            key={index}
            url={resource.url}
            title={resource.title}
            description={resource.description}
            category={resource.category}
            onError={(error) => console.error(`Error loading ${resource.url}:`, error)}
          />
        ))}
      </div>
    </div>
  );
}

// Example usage with sample resources
export const sampleResources = {
  "Writing Process & Structure": [
    {
      url: "https://owl.purdue.edu/owl/general_writing/index.html",
      title: "General Writing",
      description: "Comprehensive writing resources from Purdue University's Online Writing Lab.",
      category: "Writing Guide"
    },
    {
      url: "https://writing.wisc.edu/handbook/",
      title: "Writing Handbook",
      description: "Writing handbook with detailed guides on structure and organization.",
      category: "Writing Guide"
    }
  ],
  "Thesis & Argument Building": [
    {
      url: "https://owl.purdue.edu/owl/general_writing/academic_writing/establishing_arguments/index.html",
      title: "Establishing Arguments",
      description: "Guide to developing strong thesis statements and supporting arguments.",
      category: "Argumentation"
    },
    {
      url: "https://writingcenter.unc.edu/tips-and-tools/thesis-statements/",
      title: "Thesis Statements",
      description: "How to write effective thesis statements for academic papers.",
      category: "Argumentation"
    }
  ],
  "Critical Thinking & Questioning": [
    {
      url: "https://owl.purdue.edu/owl/general_writing/academic_writing/establishing_arguments/rhetorical_strategies.html",
      title: "Rhetorical Strategies",
      description: "Learn about different rhetorical strategies for critical analysis.",
      category: "Critical Thinking"
    }
  ],
  "Source Evaluation & Credibility": [
    {
      url: "https://owl.purdue.edu/owl/research_and_citation/conducting_research/evaluating_sources_of_information/index.html",
      title: "Evaluating Sources",
      description: "How to evaluate the credibility and reliability of sources.",
      category: "Research"
    },
    {
      url: "https://guides.library.cornell.edu/evaluating_Web_pages",
      title: "Evaluating Web Pages",
      description: "Criteria for evaluating the quality of web-based information.",
      category: "Research"
    }
  ],
  "Citations & Bibliographies": [
    {
      url: "https://owl.purdue.edu/owl/research_and_citation/mla_style/index.html",
      title: "MLA Formatting and Style Guide",
      description: "Complete guide to MLA citation format and style.",
      category: "Citation"
    },
    {
      url: "https://owl.purdue.edu/owl/research_and_citation/apa_style/index.html",
      title: "APA Formatting and Style Guide",
      description: "Complete guide to APA citation format and style.",
      category: "Citation"
    }
  ]
}; 