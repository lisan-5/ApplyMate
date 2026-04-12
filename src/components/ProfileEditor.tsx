import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap, Briefcase, Sparkles, Upload, X, Plus, Loader2,
} from "lucide-react";

interface Education {
  institution: string;
  degree: string;
  field?: string;
  start_year?: string;
  end_year?: string;
  gpa?: string;
}

interface Experience {
  title: string;
  organization: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

interface ProfileData {
  display_name: string;
  bio: string;
  education_level: string;
  major: string;
  gpa: string;
  skills: string[];
  achievements: string[];
  interests: string[];
  education: Education[];
  experience: Experience[];
}

const educationLevels = [
  { value: "high_school", label: "High School" },
  { value: "associate", label: "Associate's Degree" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "phd", label: "PhD / Doctorate" },
  { value: "other", label: "Other" },
];

export function ProfileEditor({
  initialData,
  onSaved,
}: {
  initialData: Partial<ProfileData>;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [cvText, setCvText] = useState("");

  const [data, setData] = useState<ProfileData>({
    display_name: initialData.display_name || "",
    bio: initialData.bio || "",
    education_level: initialData.education_level || "",
    major: initialData.major || "",
    gpa: initialData.gpa || "",
    skills: initialData.skills || [],
    achievements: initialData.achievements || [],
    interests: initialData.interests || [],
    education: (initialData.education as Education[]) || [],
    experience: (initialData.experience as Experience[]) || [],
  });

  const [newSkill, setNewSkill] = useState("");
  const [newAchievement, setNewAchievement] = useState("");
  const [newInterest, setNewInterest] = useState("");

  const handleParseCv = async () => {
    if (!cvText.trim()) return;
    setParsing(true);
    try {
      const { data: result, error } = await api.functions.invoke("parse-cv", {
        body: { cvText },
      });
      if (error) throw error;
      if (result.error) throw new Error(result.error);

      const p = result.parsed;
      setData({
        display_name: p.display_name || data.display_name,
        bio: p.bio || data.bio,
        education_level: p.education_level || data.education_level,
        major: p.major || data.major,
        gpa: p.gpa || data.gpa,
        skills: p.skills || data.skills,
        achievements: p.achievements || data.achievements,
        interests: p.interests || data.interests,
        education: p.education || data.education,
        experience: p.experience || data.experience,
      });
      setCvText("");
      toast({ title: "CV parsed!", description: "Review and edit the extracted data below." });
    } catch (e: any) {
      toast({ title: "Parse failed", description: e.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await api
      .from("profiles")
      .update({
        display_name: data.display_name,
        bio: data.bio,
        education_level: data.education_level || null,
        major: data.major || null,
        gpa: data.gpa || null,
        skills: data.skills,
        achievements: data.achievements,
        interests: data.interests,
        education: data.education as any,
        experience: data.experience as any,
        cv_raw_text: cvText || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved!" });
      onSaved();
    }
  };

  const addToArray = (field: "skills" | "achievements" | "interests", value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    setData((d) => ({ ...d, [field]: [...d[field], value.trim()] }));
    setter("");
  };

  const removeFromArray = (field: "skills" | "achievements" | "interests", index: number) => {
    setData((d) => ({ ...d, [field]: d[field].filter((_, i) => i !== index) }));
  };

  const addEducation = () => {
    setData((d) => ({ ...d, education: [...d.education, { institution: "", degree: "", field: "" }] }));
  };

  const updateEducation = (index: number, updates: Partial<Education>) => {
    setData((d) => ({
      ...d,
      education: d.education.map((e, i) => (i === index ? { ...e, ...updates } : e)),
    }));
  };

  const removeEducation = (index: number) => {
    setData((d) => ({ ...d, education: d.education.filter((_, i) => i !== index) }));
  };

  const addExperience = () => {
    setData((d) => ({ ...d, experience: [...d.experience, { title: "", organization: "" }] }));
  };

  const updateExperience = (index: number, updates: Partial<Experience>) => {
    setData((d) => ({
      ...d,
      experience: d.experience.map((e, i) => (i === index ? { ...e, ...updates } : e)),
    }));
  };

  const removeExperience = (index: number) => {
    setData((d) => ({ ...d, experience: d.experience.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-6">
      {/* CV Paste & Parse */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Import
          </CardTitle>
          <CardDescription>Paste your CV/resume text and let AI extract your information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Paste your CV or resume text here..."
            rows={5}
          />
          <Button onClick={handleParseCv} disabled={parsing || !cvText.trim()} className="gap-2">
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {parsing ? "Parsing..." : "Parse with AI"}
          </Button>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={data.display_name} onChange={(e) => setData({ ...data, display_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Education Level</Label>
              <Select value={data.education_level} onValueChange={(v) => setData({ ...data, education_level: v })}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {educationLevels.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Major / Field of Study</Label>
              <Input value={data.major} onChange={(e) => setData({ ...data, major: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>GPA</Label>
              <Input value={data.gpa} onChange={(e) => setData({ ...data, gpa: e.target.value })} placeholder="e.g. 3.8/4.0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio / Summary</Label>
            <Textarea value={data.bio} onChange={(e) => setData({ ...data, bio: e.target.value })} rows={3} placeholder="Brief professional summary..." />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeFromArray("skills", i)}>
                {s} <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a skill..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("skills", newSkill, setNewSkill))}
            />
            <Button variant="outline" size="icon" onClick={() => addToArray("skills", newSkill, setNewSkill)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Education History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Education
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addEducation} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.education.length === 0 && (
            <p className="text-sm text-muted-foreground">No education entries yet.</p>
          )}
          {data.education.map((edu, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-3 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeEducation(i)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Institution</Label>
                  <Input value={edu.institution} onChange={(e) => updateEducation(i, { institution: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Degree</Label>
                  <Input value={edu.degree} onChange={(e) => updateEducation(i, { degree: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Field</Label>
                  <Input value={edu.field || ""} onChange={(e) => updateEducation(i, { field: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Start</Label>
                    <Input value={edu.start_year || ""} onChange={(e) => updateEducation(i, { start_year: e.target.value })} placeholder="2020" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">End</Label>
                    <Input value={edu.end_year || ""} onChange={(e) => updateEducation(i, { end_year: e.target.value })} placeholder="2024" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Experience
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addExperience} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.experience.length === 0 && (
            <p className="text-sm text-muted-foreground">No experience entries yet.</p>
          )}
          {data.experience.map((exp, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-3 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeExperience(i)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Title / Role</Label>
                  <Input value={exp.title} onChange={(e) => updateExperience(i, { title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Organization</Label>
                  <Input value={exp.organization} onChange={(e) => updateExperience(i, { organization: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={exp.description || ""}
                  onChange={(e) => updateExperience(i, { description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Achievements & Interests */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              {data.achievements.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{a}</span>
                  <button onClick={() => removeFromArray("achievements", i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                placeholder="Add achievement..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("achievements", newAchievement, setNewAchievement))}
              />
              <Button variant="outline" size="icon" onClick={() => addToArray("achievements", newAchievement, setNewAchievement)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {data.interests.map((i, idx) => (
                <Badge key={idx} variant="outline" className="gap-1 cursor-pointer" onClick={() => removeFromArray("interests", idx)}>
                  {i} <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add interest..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("interests", newInterest, setNewInterest))}
              />
              <Button variant="outline" size="icon" onClick={() => addToArray("interests", newInterest, setNewInterest)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}


