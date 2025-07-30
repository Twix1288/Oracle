import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/oracle";

interface RoleSelectorProps {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const roleInfo = {
  builder: {
    label: "Builder",
    description: "Team member building products",
    color: "bg-blue-500/10 text-blue-700 border-blue-200"
  },
  mentor: {
    label: "Mentor",
    description: "Guide and advisor to teams",
    color: "bg-green-500/10 text-green-700 border-green-200"
  },
  lead: {
    label: "Lead",
    description: "Incubator program leader",
    color: "bg-purple-500/10 text-purple-700 border-purple-200"
  },
  guest: {
    label: "Guest",
    description: "Public visitor access",
    color: "bg-gray-500/10 text-gray-700 border-gray-200"
  }
};

export const RoleSelector = ({ selectedRole, onRoleChange }: RoleSelectorProps) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-muted-foreground">Your Role</label>
        <Select value={selectedRole} onValueChange={onRoleChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roleInfo).map(([role, info]) => (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <span>{info.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Badge className={roleInfo[selectedRole].color}>
        {roleInfo[selectedRole].description}
      </Badge>
    </div>
  );
};