export type ReplyMode = "review" | "autonomous";
export type CampaignStatus = "draft" | "active" | "paused";

export type CampaignInput = {
  name: string;
  leadListId: string;
  agentId: string;
  connectionNote: string;
  message1: string;
  followUpMessage: string;
  followUpDelayDays: number;
  replyMode: ReplyMode;
};

export type Campaign = CampaignInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: CampaignStatus;
  connectionId: string | null;
  activatedAt: string | null;
};

export const EMPTY_CAMPAIGN_INPUT: CampaignInput = {
  name: "",
  leadListId: "",
  agentId: "",
  connectionNote: "",
  message1: "",
  followUpMessage: "",
  followUpDelayDays: 5,
  replyMode: "review",
};
