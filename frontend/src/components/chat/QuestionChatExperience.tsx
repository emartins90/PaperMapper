"use client";

import ChatExperienceBase from "./ChatExperienceBase";
import { CardType } from "../useFileUploadHandler";

const questionPrompts = [
  { 
    id: "questionText", 
    prompt: "Let's start with your research question! What specific question are you trying to answer? This could be about understanding a concept, exploring a relationship, or investigating a problem. Don't worry about making it perfect - just write what you're curious about!",
    options: [],
    hasCustomOption: false
  },
  { 
    id: "questionFunction", 
    prompt: "Great question! Now let's think about what role this question plays in your research. Is it helping you clarify a concept, challenge an assumption, evaluate a source, or something else?",
    options: ["Clarify a concept", "Challenge an assumption", "Evaluate a source", "Compare or contrast", "Explore cause and effect", "Test a hypothesis", "Consider a counterpoint", "Ask an ethical question", "Propose a solution"],
    hasCustomOption: true
  },
  { 
    id: "questionPriority", 
    prompt: "Perfect! Now let's think about how important this question is to your overall research. Is it something you need to answer right away, or can it wait?",
    options: ["High", "Medium", "Low"],
    hasCustomOption: false
  },
  { 
    id: "topicalTags", 
    prompt: "Great! Now let's add some tags to help you find and organize this question later. Think of 2-4 words or short phrases that capture the main themes. Don't overthink it - just go with what feels right!",
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