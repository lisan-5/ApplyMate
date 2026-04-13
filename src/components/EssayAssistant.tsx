import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAiCache } from "@/hooks/useAiCache";
import { api } from "@/integrations/backend/client";
import type { Tables } from "@/integrations/backend/types";

type Scholarship = Tables<"scholarships">;

interface Props {
  scholarship: Scholarship;
  seededInput?: string;
  onSeedConsumed?: () => void;
}

type Msg = { role: "user" | "assistant"; content: string };

export function EssayAssistant({ scholarship, seededInput, onSeedConsumed }: Props) {
  const { toast } = useToast();
  const { getCached, setCached } = useAiCache();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore cached conversation
  useEffect(() => {
    getCached("essay_history", scholarship.id).then((cached) => {
      if (cached?.result_data?.messages?.length) {
        setMessages(cached.result_data.messages);
      }
    });
  }, [getCached, scholarship.id]);

  // Persist conversation on change
  useEffect(() => {
    if (messages.length > 0) {
      setCached("essay_history", { messages }, scholarship.id);
    }
  }, [messages, setCached, scholarship.id]);

  useEffect(() => {
    if (seededInput) {
      setInput(seededInput);
      onSeedConsumed?.();
    }
  }, [onSeedConsumed, seededInput]);

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    const userMsg: Msg = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const { data, error } = await api.functions.invoke("essay-assistant", {
        body: {
          scholarshipContext: {
            name: scholarship.name, organization: scholarship.organization,
            amount: scholarship.amount, eligibility_notes: scholarship.eligibility_notes,
            notes: scholarship.notes,
          },
          userPrompt: prompt,
          conversationHistory: messages.slice(-6),
        },
      });
      if (error) throw error;
      assistantSoFar = data?.reply || data?.error || "Essay assistant is unavailable.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantSoFar }]);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message, variant: "destructive" });
      if (!assistantSoFar) {
        setMessages((prev) => prev.filter((m) => m !== userMsg));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyLast = () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last) {
      navigator.clipboard.writeText(last.content);
      toast({ title: "Copied to clipboard!" });
    }
  };

  return (
    <Card className="glass-card rounded-2xl border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <Sparkles className="h-4 w-4" />
          </div>
          AI Writing Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div ref={scrollRef} className="max-h-[300px] overflow-y-auto space-y-3 rounded-xl border p-3 bg-muted/20">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Ask me to draft an essay, improve your writing, or brainstorm ideas for this application.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
              <div className={`inline-block max-w-[85%] rounded-xl px-3 py-2 ${m.role === "user" ? "bg-foreground text-background" : "bg-background border"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Writing...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Draft a 200-word personal statement..."
            className="min-h-[60px] flex-1 rounded-xl"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <div className="flex flex-col gap-1">
            <Button size="icon" onClick={send} disabled={isLoading || !input.trim()} className="rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
            {messages.some((m) => m.role === "assistant") && (
              <Button size="icon" variant="outline" onClick={copyLast} className="rounded-xl">
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


