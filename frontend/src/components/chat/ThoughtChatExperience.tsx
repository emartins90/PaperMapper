import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const thoughtPrompts = [
  {
    id: "thoughtText",
    prompt: "Share your thought. What are you thinking about this topic or these sources?",
    options: [],
    hasCustomOption: false
  },
  {
    id: "topicalTags",
    prompt: "Great! Now let's add some tags to help you find and organize this thought later. Think of 2-4 words or short phrases that capture the main themes. Examples: 'Teen Anxiety', 'Social Media', 'Body Image'. Don't overthink it - just go with what feels right!",
    options: [],
    hasCustomOption: false
  }
];

const promptTitles: { [key: string]: string } = {
  thoughtText: "Thought Text",
  topicalTags: "Topical Tags",
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