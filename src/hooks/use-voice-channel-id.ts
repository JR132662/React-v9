import { useParams } from "next/navigation";

import { Id } from "../../convex/_generated/dataModel";

export const useVoiceChannelId = () => {
  const params = useParams();
  return params.voiceChannelId as Id<"voiceChannels">;
};
