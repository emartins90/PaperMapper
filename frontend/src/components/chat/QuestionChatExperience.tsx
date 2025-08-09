"use client";

import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const questionPrompts = [
  { 
    id: "questionText", 
    prompt: "What's your question? Consider what might help you thread your thoughts and sources together.",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "questionFunction", 
    prompt: "Nice! Now let's consider what role this question plays in your investigation. Think about what you're trying to accomplish with it.",
    options: ["Clarify a concept", "Challenge an assumption", "Evaluate a source", "Compare or contrast", "Explore cause and effect", "Test a hypothesis", "Consider a counterpoint", "Ask an ethical question", "Investigate a solution"],
    hasCustomOption: true
  },
  { 
    id: "questionPriority", 
    prompt: "Alright, where does this question fit in your priorities? Is it urgent or something for later?",
    options: ["High", "Medium", "Low"],
    hasCustomOption: false
  },
  { 
    id: "topicalTags", 
    prompt: "Almost done. If you want, add some tags to help you track topics across your project. Otherwise, just hit done to create your question.\n\nex. 'Mental Health', 'Student Engagement', 'Ethics', etc.",
    options: [],
    hasCustomOption: false
  },
];

const promptTitles: { [key: string]: string } = {
  questionText: "Question Text",
  questionFunction: "Question Function",
  questionPriority: "Question Priority",
  topicalTags: "Topical Tags",
};

const QuestionChatExperience = (props: any) => (
  <ChatExperienceBase
    {...props}
    prompts={questionPrompts}
    promptTitles={promptTitles}
    chatType={"question" as CardType}
  />
);

export default QuestionChatExperience; 