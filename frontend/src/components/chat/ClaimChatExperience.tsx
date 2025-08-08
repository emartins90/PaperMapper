import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const claimPrompts = [
  {
    id: "claimType",
    prompt: "Is this a claim you're making to guide your paper, or a conclusion you've reached after investigating?\n\nChoose the type that best fits where you are in your thinking.",
    options: [
      {
        group: "Initial Claim",
        options: ["Hypothesis – Testable prediction or idea", "Thesis – Main argument or stance"]
      },
      {
        group: "Resulting Claim",
        options: ["Conclusion – Final answer or takeaway", "Proposal – Suggested solution or action"]
      }
    ],
    hasCustomOption: false
  },
  {
    id: "claimText",
    prompt: "What is your claim? It doesn't need to be perfect right now. You can always edit it later.",
    options: [],
    hasCustomOption: false
  },
  {
    id: "topicalTags",
    prompt: "Great! If you want, add some tags to help you track topics across your project. Otherwise, just hit done to create you claim.\n\nex. 'Decision Making', 'Climate Impact', 'Technology', etc.",
    options: [],
    hasCustomOption: false
  }
];

const promptTitles: { [key: string]: string } = {
  claimType: "Type of Claim",
  claimText: "Claim Text",
  topicalTags: "Topical Tags",
};

const ClaimChatExperience = (props: any) => (
  <ChatExperienceBase
    {...props}
    prompts={claimPrompts}
    promptTitles={promptTitles}
    chatType={"claim" as CardType}
  />
);

export default ClaimChatExperience; 