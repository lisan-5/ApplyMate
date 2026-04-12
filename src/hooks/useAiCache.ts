import { useCallback } from "react";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAiCache() {
  const { user } = useAuth();

  const getCached = useCallback(
    async (resultType: string, scholarshipId?: string) => {
      if (!user) return null;
      const query = api
        .from("ai_results_cache")
        .select("result_data, updated_at")
        .eq("user_id", user.id)
        .eq("result_type", resultType);

      if (scholarshipId) query.eq("scholarship_id", scholarshipId);
      else query.is("scholarship_id", null);

      const { data } = await query.maybeSingle();
      if (!data) return null;
      return { ...data, result_data: data.result_data as Record<string, any> };
    },
    [user]
  );

  const setCached = useCallback(
    async (resultType: string, resultData: any, scholarshipId?: string) => {
      if (!user) return;
      const row = {
        user_id: user.id,
        result_type: resultType,
        scholarship_id: scholarshipId || null,
        result_data: resultData,
      };
      await api.from("ai_results_cache").upsert(row, {
        onConflict: "user_id,scholarship_id,result_type",
      });
    },
    [user]
  );

  return { getCached, setCached };
}


