import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Edit, Save, X, Plus, Link as LinkIcon, MessageSquare, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/oracle";

interface UserProfileEditorProps {
  onProfileUpdate?: () => void;
}

interface ProfileData {
  full_name: string;
  email: string;
  role: UserRole;
  bio: string;
  skills: string[];
  help_needed: string[];
  personal_goals: string[];
  project_vision: string;
  experience_level: string;
  availability: string;
  timezone: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  discord_id: string;
}

export const UserProfileEditor = ({ onProfileUpdate }: UserProfileEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isLinkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [isLinking, setLinking] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    email: '',
    role: 'guest',
    bio: '',
    skills: [],
    help_needed: [],
    personal_goals: [],
    project_vision: '',
    experience_level: '',
    availability: '',
    timezone: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    discord_id: ''
  });

  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  // Load profile data
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        role: profile.role || 'guest',
        bio: profile.bio || '',
        skills: profile.skills || [],
        help_needed: profile.help_needed || [],
        personal_goals: profile.personal_goals || [],
        project_vision: profile.project_vision || '',
        experience_level: profile.experience_level || '',
        availability: profile.availability || '',
        timezone: profile.timezone || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        portfolio_url: profile.portfolio_url || '',
        discord_id: profile.discord_id || ''
      });
    }
  }, [profile]);

  const handleInputChange = (field: keyof ProfileData, value: string | string[]) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: 'skills' | 'help_needed' | 'personal_goals', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    handleInputChange(field, items);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          bio: profileData.bio,
          skills: profileData.skills,
          help_needed: profileData.help_needed,
          personal_goals: profileData.personal_goals,
          project_vision: profileData.project_vision,
          experience_level: profileData.experience_level,
          availability: profileData.availability,
          timezone: profileData.timezone,
          linkedin_url: profileData.linkedin_url,
          github_url: profileData.github_url,
          portfolio_url: profileData.portfolio_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully. Oracle now has the latest information about you!"
      });

      setIsEditing(false);
      await refreshProfile();
      onProfileUpdate?.();

      // Notify Oracle of profile update (for context refresh)
      try {
        await supabase.functions.invoke('enhanced-resource-oracle', {
          body: {
            query: 'Profile updated',
            type: 'profile_update',
            userId: profile.id,
            role: profileData.role,
            context: { profileData }
          }
        });
      } catch (oracleError) {
        console.log('Oracle notification failed:', oracleError);
      }

    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscordLink = async () => {
    if (!linkCode.trim()) {
      toast({
        title: "Link Code Required",
        description: "Please enter the link code from Discord",
        variant: "destructive"
      });
      return;
    }

    setLinking(true);
    try {
      const { data, error } = await supabase.rpc('link_discord_account', {
        p_link_code: linkCode.trim().toUpperCase()
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Discord Linked!",
          description: `Your Discord account has been linked successfully. You now have full cross-platform sync!`
        });

        setLinkDialogOpen(false);
        setLinkCode("");
        await refreshProfile();
        onProfileUpdate?.();
      } else {
        toast({
          title: "Link Failed",
          description: data.error || "Invalid or expired link code",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Discord link error:', error);
      toast({
        title: "Link Error",
        description: "Failed to link Discord account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLinking(false);
    }
  };

  if (!profile) {
    return (
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-6 text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Please log in to edit your profile.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/20">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-glow">Profile Editor</h2>
            <p className="text-muted-foreground">Keep your info updated for Oracle and team connections</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {profileData.discord_id && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-400/30">
              <MessageSquare className="h-3 w-3 mr-1" />
              Discord Linked
            </Badge>
          )}
          
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="ufo-gradient"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset to original data
                  if (profile) {
                    setProfileData({
                      full_name: profile.full_name || '',
                      email: profile.email || '',
                      role: profile.role || 'guest',
                      bio: profile.bio || '',
                      skills: profile.skills || [],
                      help_needed: profile.help_needed || [],
                      personal_goals: profile.personal_goals || [],
                      project_vision: profile.project_vision || '',
                      experience_level: profile.experience_level || '',
                      availability: profile.availability || '',
                      timezone: profile.timezone || '',
                      linkedin_url: profile.linkedin_url || '',
                      github_url: profile.github_url || '',
                      portfolio_url: profile.portfolio_url || '',
                      discord_id: profile.discord_id || ''
                    });
                  }
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="ufo-gradient"
              >
                {isSaving ? (
                  <div className="h-4 w-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="basic" className="data-[state=active]:bg-primary/20">
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="professional" className="data-[state=active]:bg-primary/20">
            Professional
          </TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-primary/20">
            Connections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    disabled={!isEditing}
                    className="bg-background/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted/50 text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself, your background, and what you're passionate about..."
                  className="bg-background/50 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience_level">Experience Level</Label>
                  <Select
                    value={profileData.experience_level}
                    onValueChange={(value) => handleInputChange('experience_level', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    value={profileData.availability}
                    onChange={(e) => handleInputChange('availability', e.target.value)}
                    disabled={!isEditing}
                    placeholder="e.g., Weekdays 9-5 EST"
                    className="bg-background/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={profileData.skills.join(', ')}
                  onChange={(e) => handleArrayFieldChange('skills', e.target.value)}
                  disabled={!isEditing}
                  placeholder="React, Node.js, Machine Learning, Product Management..."
                  className="bg-background/50"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="help_needed">Can Help With (comma-separated)</Label>
                <Input
                  id="help_needed"
                  value={profileData.help_needed.join(', ')}
                  onChange={(e) => handleArrayFieldChange('help_needed', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Frontend Development, Marketing, User Research..."
                  className="bg-background/50"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.help_needed.map((help, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {help}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal_goals">Personal Goals (comma-separated)</Label>
                <Input
                  id="personal_goals"
                  value={profileData.personal_goals.join(', ')}
                  onChange={(e) => handleArrayFieldChange('personal_goals', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Launch a startup, Learn AI/ML, Build network..."
                  className="bg-background/50"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.personal_goals.map((goal, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-blue-500/10 text-blue-400">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_vision">Project Vision</Label>
                <Textarea
                  id="project_vision"
                  value={profileData.project_vision}
                  onChange={(e) => handleInputChange('project_vision', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Describe your current project or startup vision..."
                  className="bg-background/50 min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Links & Connections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    value={profileData.linkedin_url}
                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                    disabled={!isEditing}
                    placeholder="https://linkedin.com/in/yourusername"
                    className="bg-background/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="github_url">GitHub URL</Label>
                  <Input
                    id="github_url"
                    value={profileData.github_url}
                    onChange={(e) => handleInputChange('github_url', e.target.value)}
                    disabled={!isEditing}
                    placeholder="https://github.com/yourusername"
                    className="bg-background/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio URL</Label>
                  <Input
                    id="portfolio_url"
                    value={profileData.portfolio_url}
                    onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
                    disabled={!isEditing}
                    placeholder="https://yourportfolio.com"
                    className="bg-background/50"
                  />
                </div>
              </div>

              {/* Discord Linking */}
              <div className="p-4 rounded-lg bg-background/30 border border-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Discord Integration
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Link your Discord for cross-platform Oracle sync
                    </p>
                  </div>
                  
                  {profileData.discord_id ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-400/30">
                      ✅ Linked
                    </Badge>
                  ) : (
                    <Dialog open={isLinkDialogOpen} onOpenChange={setLinkDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Link Discord
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Link Discord Account
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground">
                            <p className="mb-3">To link your Discord account:</p>
                            <ol className="list-decimal list-inside space-y-1">
                              <li>Go to Discord and use <code>/link</code> command</li>
                              <li>Copy the link code you receive</li>
                              <li>Paste it below and click "Link Account"</li>
                            </ol>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="linkCode">Link Code</Label>
                            <Input
                              id="linkCode"
                              value={linkCode}
                              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                              placeholder="Enter 6-digit code from Discord"
                              maxLength={6}
                              className="text-center font-mono text-lg"
                            />
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setLinkDialogOpen(false);
                                setLinkCode("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleDiscordLink}
                              disabled={isLinking || linkCode.length !== 6}
                            >
                              {isLinking ? (
                                <div className="h-4 w-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                              ) : (
                                <LinkIcon className="h-4 w-4 mr-2" />
                              )}
                              Link Account
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                
                {profileData.discord_id && (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">✅ Your Discord is fully integrated:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Cross-platform messaging (Discord ↔ Website)</li>
                      <li>Synchronized Oracle commands</li>
                      <li>Profile updates sync automatically</li>
                      <li>Mentions work across both platforms</li>
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Oracle Sync Indicator */}
      {isEditing && (
        <Card className="glow-border bg-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h4 className="font-medium text-primary">Oracle Sync</h4>
                <p className="text-sm text-muted-foreground">
                  When you save changes, Oracle will automatically update with your latest information for better recommendations and connections.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};