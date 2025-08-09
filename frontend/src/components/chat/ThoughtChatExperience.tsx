import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const thoughtPrompts = [
  {
    id: "thoughtText",
    prompt: "This is your space to write down whatever you're thinking. It can be as structured or unstructured as you want.",
    options: [],
    hasCustomOption: false
  },
  {
    id: "topicalTags",
    prompt: "If you want, add some tags to help you track topics across your project. Otherwise, just hit done to create your thought.\n\nex. 'Social Impact', 'Cell Division', 'Urbanization', etc.",
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