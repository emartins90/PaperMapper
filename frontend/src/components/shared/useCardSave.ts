import { useState } from "react";
import { uploadFilesForCardType, CardType } from "../useFileUploadHandler";

interface UseCardSaveProps {
  cardId: string;
  cardType: CardType;
  projectId: number;
  nodePosition?: { x: number; y: number };
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  onAddCard?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
}

interface SaveCardData {
  cardId: string;
  chatAnswers: any;
  uploadedFiles: File[];
}

export const useCardSave = ({
  cardId,
  cardType,
  projectId,
  nodePosition,
  onUpdateNodeData,
  onAddCard,
  onDeleteCard,
}: UseCardSaveProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const saveCard = async (data: SaveCardData) => {
    const { cardId, chatAnswers, uploadedFiles } = data;
    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Determine the endpoint and payload based on card type
      let endpoint: string;
      let payload: any;

      switch (cardType) {
        case "source":
          // For source cards, we need to create citation first, then source material
          // This will be handled separately in the source case
          endpoint = "/source_materials/";
          payload = {
            project_id: projectId,
            citation_id: null, // Will be created by backend
            content: chatAnswers.sourceContent || "",
            content_formatted: chatAnswers.sourceContentFormatted || "",
            summary: chatAnswers.summary || "",
            summary_formatted: chatAnswers.summaryFormatted || "",
            tags: chatAnswers.topicalTags || [],
            argument_type: chatAnswers.argumentType || "",
            function: chatAnswers.sourceFunction || "",
            files: "",
            notes: "",
          };
          
          console.log("=== DEBUG: useCardSave - source payload ===");
          console.log("chatAnswers:", chatAnswers);
          console.log("payload:", payload);
          break;

        case "question":
          endpoint = "/questions/";
          payload = {
            project_id: projectId,
            question_text: chatAnswers.questionText || "",
            question_text_formatted: chatAnswers.questionTextFormatted || "",
            category: chatAnswers.questionFunction || chatAnswers.category || "",
            status: chatAnswers.status || "unexplored",
            priority: chatAnswers.questionPriority || chatAnswers.priority || "",
            tags: chatAnswers.topicalTags || [],
          };
          break;

        case "insight":
          endpoint = "/insights/";
          payload = {
            project_id: projectId,
            insight_text: chatAnswers.insightText || "",
            insight_text_formatted: chatAnswers.insightTextFormatted || "",
            insight_type: chatAnswers.insightType || "",
            tags: chatAnswers.topicalTags || [],
          };
          break;

        case "thought":
          endpoint = "/thoughts/";
          payload = {
            project_id: projectId,
            thought_text: chatAnswers.thoughtText || "",
            thought_text_formatted: chatAnswers.thoughtTextFormatted || "",
            tags: chatAnswers.topicalTags || [],
          };
          break;

        case "claim":
          endpoint = "/claims/";
          payload = {
            project_id: projectId,
            claim_text: chatAnswers.claimText || "",
            claim_text_formatted: chatAnswers.claimTextFormatted || "",
            claim_type: chatAnswers.claimType || "Hypothesis",
            tags: chatAnswers.topicalTags || [],
            files: "",
          };
          break;

        default:
          throw new Error(`Unsupported card type: ${cardType}`);
      }

      // Create the card in the backend
      let response;
      
      if (cardType === "source") {
        
        // For source cards, handle citation (either create new or use existing)
        let citationId = null;
        
        // If user selected an existing citation, use that ID
        if (chatAnswers.selectedCitationId) {
          citationId = parseInt(chatAnswers.selectedCitationId as string);
        }
        // Otherwise, create new citation if there's citation content
        else if (chatAnswers.sourceCitation && chatAnswers.sourceCitation.trim()) {
          const citationPayload = {
            text: chatAnswers.sourceCitation.trim(),
            credibility: chatAnswers.sourceCredibility || "",
            project_id: projectId,
          };
          
          const citationResponse = await fetch(`${API_URL}/citations/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(citationPayload),
          });
          
          if (!citationResponse.ok) {
            const errorText = await citationResponse.text();
            throw new Error(`Failed to create citation: ${citationResponse.status} ${errorText}`);
          }
          
          const savedCitation = await citationResponse.json();
          citationId = savedCitation.id;
          
          // Dispatch citation update event to refresh source list
          window.dispatchEvent(new CustomEvent('citationUpdate'));
        }
        
        // Create the source material (with or without citation ID)
        const sourceMaterialPayload = {
          project_id: projectId,
          citation_id: citationId,
          content: chatAnswers.sourceContent || "",
          content_formatted: chatAnswers.sourceContentFormatted || "",
          summary: chatAnswers.summary || "",
          summary_formatted: chatAnswers.summaryFormatted || "",
          tags: chatAnswers.topicalTags || [],
          argument_type: chatAnswers.argumentType || "",
          function: chatAnswers.sourceFunction || "",
          files: "",
          notes: "",
        };
        
        console.log("=== DEBUG: useCardSave - sourceMaterialPayload ===");
        console.log("sourceMaterialPayload:", sourceMaterialPayload);
        
        response = await fetch(`${API_URL}/source_materials/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(sourceMaterialPayload),
        });
        
        // Dispatch source material update event to refresh source list
        console.log('useCardSave: Dispatching sourceMaterialUpdate event');
        window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
      } else {
        // For other card types, use the standard approach
        response = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(payload),
        });
      }



      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create card: ${response.status} ${errorText}`);
      }

      const createdCard = await response.json();

      // Upload files if any
      if (uploadedFiles.length > 0) {
        
        // Get the backend ID from the created card
        let backendId: number;
        switch (cardType) {
          case "source":
            backendId = parseInt(createdCard.id);
            break;
          case "question":
            backendId = parseInt(createdCard.id);
            break;
          case "insight":
            backendId = parseInt(createdCard.id);
            break;
          case "thought":
            backendId = parseInt(createdCard.id);
            break;
          case "claim":
            backendId = parseInt(createdCard.id);
            break;
          default:
            throw new Error(`Unsupported card type: ${cardType}`);
        }

        // Validate that we got a valid backend ID
        if (isNaN(backendId) || !backendId) {
          throw new Error(`Invalid backend ID received for ${cardType} card: ${createdCard}`);
        }



        // Upload files using the existing uploadFilesForCardType function
        await uploadFilesForCardType(
          cardType,
          backendId,
          uploadedFiles,
          [], // No existing files for new cards
          (newFiles: string[], newFileEntries: any[]) => {
            // Update node data with the new files and fileEntries
            if (onUpdateNodeData) {
              onUpdateNodeData(cardId, { files: newFiles, fileEntries: newFileEntries });
            }
          }
        );
      }

      // Update node data with backend IDs and other data
      const nodeDataUpdate: any = {};
      
      console.log("=== DEBUG: useCardSave - nodeDataUpdate before switch ===");
      console.log("cardType:", cardType);
      console.log("chatAnswers:", chatAnswers);
      
      switch (cardType) {
        case "source":
          nodeDataUpdate.sourceMaterialId = createdCard.id;
          // For source cards, citation ID might be null if no citation was created
          nodeDataUpdate.citationId = createdCard.citation_id || null;
          nodeDataUpdate.source = chatAnswers.sourceCitation || "";
          nodeDataUpdate.summary = chatAnswers.summary || "";
          nodeDataUpdate.summaryFormatted = chatAnswers.summaryFormatted || "";
          nodeDataUpdate.text = chatAnswers.sourceContent || "";
          nodeDataUpdate.contentFormatted = chatAnswers.sourceContentFormatted || "";
          nodeDataUpdate.tags = chatAnswers.topicalTags || [];
          nodeDataUpdate.thesisSupport = chatAnswers.argumentType || "";
          nodeDataUpdate.sourceFunction = chatAnswers.sourceFunction || "";
          nodeDataUpdate.credibility = chatAnswers.sourceCredibility || "";
          nodeDataUpdate.additionalNotes = "";
          
          console.log("=== DEBUG: useCardSave - source nodeDataUpdate ===");
          console.log("nodeDataUpdate:", nodeDataUpdate);
          break;

        case "question":
          nodeDataUpdate.questionId = createdCard.id;
          nodeDataUpdate.question = chatAnswers.questionText || "";
          nodeDataUpdate.questionFormatted = chatAnswers.questionTextFormatted || "";
          nodeDataUpdate.category = chatAnswers.questionFunction || chatAnswers.category || "";
          nodeDataUpdate.status = chatAnswers.status || "unexplored";
          nodeDataUpdate.priority = chatAnswers.questionPriority || chatAnswers.priority || "";
          nodeDataUpdate.tags = chatAnswers.topicalTags || [];
          break;

        case "insight":
          nodeDataUpdate.insightId = createdCard.id;
          nodeDataUpdate.insight = chatAnswers.insightText || "";
          nodeDataUpdate.insightFormatted = chatAnswers.insightTextFormatted || "";
          nodeDataUpdate.insightType = chatAnswers.insightType || "";
          nodeDataUpdate.tags = chatAnswers.topicalTags || [];
          break;

        case "thought":
          nodeDataUpdate.thoughtId = createdCard.id;
          nodeDataUpdate.thought = chatAnswers.thoughtText || "";
          nodeDataUpdate.thoughtFormatted = chatAnswers.thoughtTextFormatted || "";
          nodeDataUpdate.tags = chatAnswers.topicalTags || [];
          break;

        case "claim":
          nodeDataUpdate.claimId = createdCard.id;
          nodeDataUpdate.claim = chatAnswers.claimText || "";
          nodeDataUpdate.claimFormatted = chatAnswers.claimTextFormatted || "";
          nodeDataUpdate.claimType = chatAnswers.claimType || "Hypothesis";
          nodeDataUpdate.tags = chatAnswers.topicalTags || [];
          break;
      }

      // Create the card record in the database
      const cardPayload = {
        type: cardType,
        data_id: createdCard.id,
        position_x: nodePosition?.x || 0,
        position_y: nodePosition?.y || 0,
        project_id: projectId,
      };


      
      const cardResponse = await fetch(`${API_URL}/cards/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(cardPayload),
      });

      if (!cardResponse.ok) {
        const errorText = await cardResponse.text();
        throw new Error(`Failed to create card record: ${cardResponse.status} ${errorText}`);
      }

      const savedCard = await cardResponse.json();

      // Update the node data with the card ID
      nodeDataUpdate.cardId = savedCard.id;

      // Update the node data
      if (onUpdateNodeData) {
        console.log("=== DEBUG: useCardSave - calling onUpdateNodeData ===");
        console.log("cardId:", cardId);
        console.log("nodeDataUpdate:", nodeDataUpdate);
        onUpdateNodeData(cardId, nodeDataUpdate);
      }

      // Call onAddCard to finalize the card creation
      if (onAddCard) {
        onAddCard(cardId);
      }

      return { ...createdCard, cardId: savedCard.id };

    } catch (error) {
      console.error(`[useCardSave] Error saving ${cardType} card:`, error);
      
      // If save fails, delete the unsaved card
      if (onDeleteCard) {
        onDeleteCard(cardId);
      }
      
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveCard,
    isSaving,
  };
}; 