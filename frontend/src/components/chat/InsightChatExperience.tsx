import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const insightPrompts = [
  {
    id: "insightText",
    prompt: "Describe the insight or pattern you noticed. What connection or pattern emerged from your sources?",
    options: [],
    hasCustomOption: false
  }
];

const promptTitles: { [key: string]: string } = {
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