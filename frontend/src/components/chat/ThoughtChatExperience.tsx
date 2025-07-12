import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const thoughtPrompts = [
  {
    id: "thoughtText",
    prompt: "Share your thought. What are you thinking about this topic or these sources?",
    options: [],
    hasCustomOption: false
  }
];

const promptTitles: { [key: string]: string } = {
  thoughtText: "Thought Text",
};

const ThoughtChatExperience = (props: any) => (
  <ChatExperienceBase
    {...props}
    prompts={thoughtPrompts}
    promptTitles={promptTitles}
    chatType={"thought" as CardType}
  />
);

export default ThoughtChatExperience; 