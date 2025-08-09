import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const insightPrompts = [
  {
    id: "insightText",
    prompt: "What did you discover or realize? Describe the insight you want to capture.",
    options: [],
    hasCustomOption: false
  },
  {
    id: "insightType",
    prompt: "Awesome! How does this insight fit into your project? Think about what it helped you understand or what it revealed about your sources.",
    options: [
      "Resolved Confusion",
      "Noticed a Pattern",
      "Evaluated a Source",
      "Identified a Gap",
      "Reframed the Issue",
      "Highlighted Impact"
    ],
    hasCustomOption: true // Enable add your own option
  },
  {
    id: "topicalTags",
    prompt: "Last step! If you want, add tags to help you track topics across your project. Otherwise, just hit done to save your insight.\n\nex. 'Case Studies', 'Ethics', 'Data Quality', etc.",
    options: [],
    hasCustomOption: false
  }
];

const promptTitles: { [key: string]: string } = {
  insightType: "Insight Type",
  insightText: "Insight Text",
  topicalTags: "Topical Tags",
};

const InsightChatExperience = (props: any) => (
  <ChatExperienceBase
    {...props}
    prompts={insightPrompts}
    promptTitles={promptTitles}
    chatType={"insight" as CardType}
  />
);

export default InsightChatExperience; 