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
  }
];

const promptTitles: { [key: string]: string } = {
  insightType: "Insight Type",
  insightText: "Insight Text",
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