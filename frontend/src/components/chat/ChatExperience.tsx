"use client";

import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const sourcePrompts = [
  { 
    id: "sourceFunction", 
    prompt: "Let's start by understanding what role this source plays in your paper! Consider what you need this source to accomplish.",
    options: ["Evidence", "Definition", "Background Info", "Data Point", "Theory", "Concept"],
    hasCustomOption: true
  },
  { 
    id: "sourceContent", 
    prompt: "Now let's add the actual content from your source. Paste or type the relevant text, quotes, or excerpts from your source. You can also upload images or files if needed.",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "summary", 
    prompt: "You've captured a lot of detail here. Now take a moment to think about what is most important about this source. Write a short summary of the key points. This is what you'll see on your card. ",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "topicalTags", 
    prompt: "Great! Tags are useful for tracking topics across your project. If you want, think of a fewwords or short phrases that capture the main themes.\n\nex. 'Artificial Intelligence', 'Greek Mythology', 'Impressionism', etc.",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "argumentType", 
    prompt: "Does this source support your claims or other sources, go against it, or stay neutral?",
    options: ["Thesis-supporting", "Counter-evidence", "Neutral to thesis"],
    hasCustomOption: false
  },
  { 
    id: "sourceCitation", 
    prompt: "Almost done. Let's get the citation details so you can properly reference this source. Include whatever you have - author, title, publication, date, URL, etc. You can always formatthis later!",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "sourceCredibility", 
    prompt: "Finally, take a moment to evaluate how trustworthy this source is. Consider where it's published, who created it, and how the information was gathered.",
    options: [
      "Peer-Reviewed – Ex. Academic journal",
      "Editorially Reviewed (Scholarly) – Ex. Textbooks",
      "Editorially Reviewed (Media) – Ex. Newspapers",
      "Organizationally Reviewed – Ex. NGO publications",
      "Minimally Reviewed – Ex. Wikipedia articles",
      "Unreviewed – Ex. Personal blogs",
      "Unknown Origin"
    ],
    hasCustomOption: true
  },
];

const promptTitles: { [key: string]: string } = {
  sourceFunction: "Source Function",
  sourceContent: "Source Content",
  summary: "Summary",
  topicalTags: "Tags",
  argumentType: "Argument Type",
  sourceCredibility: "Source Credibility",
  sourceCitation: "Citation",
};

const ChatExperience = (props: any) => (
  <ChatExperienceBase
    {...props}
    prompts={sourcePrompts}
    promptTitles={promptTitles}
    chatType={"source" as CardType}
  />
);

export default ChatExperience;