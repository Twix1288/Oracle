import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crown, Copy, Check, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const MasterAccessCodes = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const masterCodes = [
    {
      id: "lead-master",
      role: "lead",
      code: "PIEFI-LEAD-MASTER-2025",
      description: "Master Lead Access - Full System Control",
      permissions: ["Create Teams", "Manage All Users", "Access All Data", "Discord Bot Control", "System Administration"]
    },
    {
      id: "mentor-master", 
      role: "mentor",
      code: "PIEFI-MENTOR-GUIDE-2025",
      description: "Master Mentor Access - Full Guidance Powers",
      permissions: ["Guide All Teams", "Access Team Data", "Message Broadcasting", "Progress Tracking"]
    },
    {
      id: "builder-master",
      role: "builder", 
      code: "PIEFI-BUILDER-CREATE-2025",
      description: "Master Builder Access - Full Building Rights",
      permissions: ["Join Any Team", "Access Team Resources", "Oracle Access", "Team Communications"]
    }
  ];

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Master Code Copied!",
      description: `${code} copied to clipboard`,
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lead': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'mentor': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'builder': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
          <Crown className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-glow">Master Access Codes</h2>
          <p className="text-muted-foreground">Universal access codes for system administration</p>
        </div>
      </div>

      <div className="grid gap-4">
        {masterCodes.map((masterCode) => (
          <Card key={masterCode.id} className="glow-border bg-gradient-to-r from-card/80 to-card/60 backdrop-blur border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`${getRoleColor(masterCode.role)} font-semibold text-sm px-3 py-1`}>
                    {masterCode.role.toUpperCase()}
                  </Badge>
                  <CardTitle className="text-lg">{masterCode.description}</CardTitle>
                </div>
                <Crown className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-primary/20">
                <KeyRound className="h-4 w-4 text-primary" />
                <code className="flex-1 font-mono text-sm font-bold text-primary">
                  {masterCode.code}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(masterCode.code, masterCode.id)}
                  className="text-primary hover:bg-primary/20"
                >
                  {copiedCode === masterCode.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-primary">Permissions:</h4>
                <div className="flex flex-wrap gap-2">
                  {masterCode.permissions.map((permission, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glow-border bg-card/50 backdrop-blur border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <Crown className="h-5 w-5" />
            Master Code Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p className="font-semibold text-amber-300">🔐 How to use Master Codes:</p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Copy the desired master code using the copy button</li>
            <li>Share with authorized users for instant role assignment</li>
            <li>Users can enter the code in the role selector to gain access</li>
            <li>Master codes provide full permissions for that role level</li>
          </ol>
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-300 font-medium">⚠️ Security Notice:</p>
            <p className="text-xs">Master codes grant full system access. Only share with trusted administrators.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};