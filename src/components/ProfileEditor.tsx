import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, User, Save, X, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ProfileEditorProps {
  trigger?: "button" | "icon";
  className?: string;
}

export const ProfileEditor = ({ trigger = "button", className = "" }: ProfileEditorProps) => {
  const { profile, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    bio: profile?.bio || "",
    experience_level: profile?.experience_level || "",
    availability: profile?.availability || "",
    timezone: profile?.timezone || "",
    linkedin_url: profile?.linkedin_url || "",
    github_url: profile?.github_url || "",
    portfolio_url: profile?.portfolio_url || "",
    skills: profile?.skills || [],
    personal_goals: profile?.personal_goals || [],
    project_vision: profile?.project_vision || "",
    help_needed: profile?.help_needed || []
  });
  
  const [newSkill, setNewSkill] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newHelp, setNewHelp] = useState("");
  
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user?.id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsOpen(false);
      toast.success("Profile updated successfully!");
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
      toast.error("Failed to update profile. Please try again.");
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addGoal = () => {
    if (newGoal.trim() && !formData.personal_goals.includes(newGoal.trim())) {
      setFormData(prev => ({
        ...prev,
        personal_goals: [...prev.personal_goals, newGoal.trim()]
      }));
      setNewGoal("");
    }
  };

  const removeGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      personal_goals: prev.personal_goals.filter(g => g !== goal)
    }));
  };

  const addHelp = () => {
    if (newHelp.trim() && !formData.help_needed.includes(newHelp.trim())) {
      setFormData(prev => ({
        ...prev,
        help_needed: [...prev.help_needed, newHelp.trim()]
      }));
      setNewHelp("");
    }
  };

  const removeHelp = (help: string) => {
    setFormData(prev => ({
      ...prev,
      help_needed: prev.help_needed.filter(h => h !== help)
    }));
  };

  const TriggerComponent = trigger === "icon" ? (
    <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${className}`}>
      <Edit className="h-4 w-4" />
    </Button>
  ) : (
    <Button variant="outline" size="sm" className={`flex items-center gap-2 ${className}`}>
      <Settings className="h-4 w-4" />
      Edit Profile
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {TriggerComponent}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Your Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <Select 
                    value={formData.experience_level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Links */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Contact & Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Select 
                    value={formData.availability} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="weekends">Weekends only</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={formData.timezone}
                    onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                    placeholder="e.g., EST, PST, GMT+2"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>GitHub URL</Label>
                  <Input
                    value={formData.github_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Portfolio URL</Label>
                  <Input
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button onClick={addSkill} size="sm">Add</Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeSkill(skill)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Goals & Vision */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Goals & Vision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Project Vision</Label>
                <Textarea
                  value={formData.project_vision}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_vision: e.target.value }))}
                  placeholder="Describe your project vision..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Personal Goals</Label>
                <div className="flex gap-2">
                  <Input
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Add a personal goal..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                  />
                  <Button onClick={addGoal} size="sm">Add</Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.personal_goals.map((goal, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {goal}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeGoal(goal)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Help Needed</Label>
                <div className="flex gap-2">
                  <Input
                    value={newHelp}
                    onChange={(e) => setNewHelp(e.target.value)}
                    placeholder="What help do you need?"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHelp())}
                  />
                  <Button onClick={addHelp} size="sm">Add</Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.help_needed.map((help, index) => (
                    <Badge key={index} variant="destructive" className="flex items-center gap-1">
                      {help}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive-foreground" 
                        onClick={() => removeHelp(help)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {updateProfileMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};