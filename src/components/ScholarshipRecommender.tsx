import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";
import { useAiCache } from "@/hooks/useAiCache";

interface Props {
  profile: any;
}

export function ScholarshipRecommender({ profile }: Props) {
  const { toast } = useToast();
  const { getCached, setCached } = useAiCache();
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCached("recommender").then((cached) => {
      if (cached?.result_data?.recommendations) {
        setRecommendations(cached.result_data.recommendations);
      }
    });
  }, [getCached]);

  const fetch = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await api.functions.invoke("ai-recommender", {
        body: {
          education_level: profile.education_level,
          major: profile.major,
          gpa: profile.gpa,
          skills: profile.skills,
          achievements: profile.achievements,
          interests: profile.interests,
        },
      });
      if (error) throw error;
      const text = data?.recommendations || "No recommendations available.";
      setRecommendations(text);
      await setCached("recommender", { recommendations: text });
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasProfile = profile?.education_level || profile?.major || profile?.skills?.length > 0;

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <Lightbulb className="h-4 w-4" />
          </div>
          Discover Scholarships
        </CardTitle>
        {hasProfile && (
          <Button
            variant="outline" size="sm"
            onClick={fetch} disabled={loading}
            className="gap-1.5 rounded-xl text-xs h-8"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {recommendations ? "Refresh" : "Get Ideas"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your profile...
          </div>
        ) : recommendations ? (
          <p className="text-sm leading-relaxed whitespace-pre-line">{recommendations}</p>
        ) : !hasProfile ? (
          <p className="text-sm text-muted-foreground py-2">
            Complete your profile (education, major, skills) to get personalized scholarship recommendations.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            Click "Get Ideas" for AI-powered scholarship suggestions based on your profile.
          </p>
        )}
      </CardContent>
    </Card>
  );
}


