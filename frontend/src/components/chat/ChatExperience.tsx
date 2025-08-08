"use client";

import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const sourcePrompts = [
  { 
    id: "sourceFunction", 
    prompt: "Let's start by understanding what role this source plays in your paper! Is it providing evidence, defining a concept, giving background info, or something else?",
    options: ["Evidence", "Definition", "Background Info", "Data Point", "Theory", "Concept"],
    hasCustomOption: true
  },
  { 
    id: "sourceContent", 
    prompt: "Perfect! Now let's add the content from your source. Paste or type the relevant text, quotes, or excerpts from your source. You can also upload images or files if needed. This will be the foundation of your paper - no need to be perfect, just get the key content in here!",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "summary", 
    prompt: "Excellent! Now let's create a brief summary of the key points. Based on the content you just added, write 2-3 sentences that capture what's most important for your paper. Focus on what stood out to you!",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "topicalTags", 
    prompt: "Perfect! Now let's add some tags to help you find and organize this source later. Think of 2-4 words or short phrases that capture the main themes. Examples: 'Teen Anxiety', 'Social Media', 'Body Image'. Don't overthink it - just go with what feels right!",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "argumentType", 
    prompt: "Nice work! Now let's think about how this source supports your paper. Does it support your main argument, go against it, or stay neutral?",
    options: ["Thesis-supporting", "Counter-evidence", "Neutral to thesis"],
    hasCustomOption: false
  },
  { 
    id: "sourceCitation", 
    prompt: "Great! Now let's get the citation details so you can properly reference this source. Include whatever you have - author, title, publication, date, URL. Don't worry if it's not complete, we can help format it later!",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "sourceCredibility", 
    prompt: "Last step! Let's evaluate how trustworthy this source is. Consider where it's published, who wrote it, and how the information was gathered.",
    options: ["Peer-reviewed study", "News article (reputable)", "News article (biased)", "Expert opinion", "Institutional report", "Personal experience", "Blog or opinion piece", "Speculative claim", "Social media post", "Unclear origin"],
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