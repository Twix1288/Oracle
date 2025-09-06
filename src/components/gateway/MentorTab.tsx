import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Award, Users, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function MentorTab() {
  const [expertise, setExpertise] = useState('');
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const expertiseAreas = [
    'Web Development', 'Mobile Apps', 'AI/ML', 'Blockchain', 'Design',
    'Business Strategy', 'Marketing', 'Data Science', 'DevOps', 'Product Management'
  ];

  const handleBecomeMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Please sign in first to become a mentor');
      }

      // Update user profile to mentor role
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          role: 'mentor',
          skills: expertise.split(',').map(e => e.trim()).filter(Boolean),
          bio: bio.trim(),
          availability: availability.trim(),
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw updateError;
      }

      toast.success('Welcome to the PieFi mentor community! You can now help guide teams to success.');
      
      // Redirect to dashboard
      navigate('/');
      
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <BookOpen className="mx-auto h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Become a Mentor</h2>
        <p className="text-muted-foreground">
          Share your expertise and help guide teams to achieve their goals in the PieFi ecosystem
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="text-center">
          <Award className="mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold">Share Knowledge</h3>
          <p className="text-sm text-muted-foreground">Guide teams with your expertise</p>
        </div>
        <div className="text-center">
          <Users className="mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold">Build Community</h3>
          <p className="text-sm text-muted-foreground">Connect with passionate builders</p>
        </div>
        <div className="text-center">
          <Heart className="mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold">Make Impact</h3>
          <p className="text-sm text-muted-foreground">Help shape the future of projects</p>
        </div>
      </div>

      <form onSubmit={handleBecomeMentor} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="expertise">Areas of Expertise</Label>
          <Input
            id="expertise"
            type="text"
            placeholder="e.g., Web Development, AI/ML, Product Strategy"
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            required
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {expertiseAreas.map((area) => (
              <Badge 
                key={area}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                onClick={() => {
                  const current = expertise.split(',').map(e => e.trim()).filter(Boolean);
                  if (!current.includes(area)) {
                    setExpertise([...current, area].join(', '));
                  }
                }}
              >
                {area}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Mentor Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell teams about your background and how you can help them succeed"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="availability">Availability & Preferences</Label>
          <Textarea
            id="availability"
            placeholder="e.g., Weekends only, prefer async communication, available for 1-hour sessions"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            rows={3}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button type="submit" className="w-full" disabled={loading || !expertise || !bio}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Becoming Mentor...
            </>
          ) : (
            <>
              <BookOpen className="mr-2 h-4 w-4" />
              Become a Mentor
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">🎯 As a mentor, you'll be able to:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Provide guidance and feedback to teams</li>
          <li>• Access the mentor dashboard with mentorship tools</li>
          <li>• Connect with teams that match your expertise</li>
          <li>• Participate in the broader PieFi community</li>
        </ul>
      </div>
    </div>
  );
}