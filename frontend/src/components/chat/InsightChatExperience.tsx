import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const insightPrompts = [
  {
    id: "insightType",
    prompt: "What type of insight is this?",
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
    id: "insightText",
    prompt: "Describe the insight or pattern you noticed. What connection or pattern emerged from your sources?",
    options: [],
    hasCustomOption: false
  },
  {
    id: "topicalTags",
    prompt: "Great! Now let's add some tags to help you find and organize this insight later. Think of 2-4 words or short phrases that capture the main themes. Examples: 'Teen Anxiety', 'Social Media', 'Body Image'. Don't overthink it - just go with what feels right!",
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