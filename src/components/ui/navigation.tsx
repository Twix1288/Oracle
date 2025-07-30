import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  LogOut, 
  User, 
  Shield, 
  Wrench, 
  Eye,
  Sparkles,
  Bell,
  Search
} from "lucide-react"
import type { UserRole } from "@/types/oracle"

interface NavigationHeaderProps {
  role: UserRole
  onLogout: () => void
  className?: string
}

const roleInfo = {
  builder: {
    label: "Builder",
    icon: Wrench,
    color: "bg-blue-500/10 text-blue-700 border-blue-200"
  },
  mentor: {
    label: "Mentor", 
    icon: Shield,
    color: "bg-green-500/10 text-green-700 border-green-200"
  },
  lead: {
    label: "Lead",
    icon: User,
    color: "bg-primary/10 text-primary border-primary/20"
  },
  guest: {
    label: "Guest",
    icon: Eye,
    color: "bg-gray-500/10 text-gray-700 border-gray-200"
  }
}

export const NavigationHeader = ({ role, onLogout, className }: NavigationHeaderProps) => {
  const roleData = roleInfo[role]
  const RoleIcon = roleData.icon

  return (
    <header className={cn(
      "border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50",
      className
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 ufo-glow">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-glow">PieFi Oracle</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Incubator Assistant</p>
            </div>
          </div>

          {/* Center - Search (for larger screens) */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ask Oracle anything..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Right - User Info & Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Role Badge */}
            <Badge className={cn("gap-1.5", roleData.color)}>
              <RoleIcon className="w-3 h-3" />
              {roleData.label}
            </Badge>

            {/* User Avatar */}
            <Avatar className="w-8 h-8 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {roleData.label.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Settings & Logout */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ask Oracle anything..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>
    </header>
  )
}

interface NavigationSidebarProps {
  role: UserRole
  activeSection?: string
  onSectionChange?: (section: string) => void
  className?: string
}

export const NavigationSidebar = ({ 
  role, 
  activeSection, 
  onSectionChange, 
  className 
}: NavigationSidebarProps) => {
  const navigation = {
    builder: [
      { id: "dashboard", label: "Dashboard", icon: "📊" },
      { id: "updates", label: "Daily Updates", icon: "📝" },
      { id: "milestones", label: "Milestones", icon: "🎯" },
      { id: "messages", label: "Messages", icon: "💬" },
      { id: "oracle", label: "Oracle AI", icon: "🤖" },
      { id: "files", label: "Files", icon: "📁" }
    ],
    mentor: [
      { id: "dashboard", label: "Dashboard", icon: "📊" },
      { id: "teams", label: "My Teams", icon: "👥" },
      { id: "reviews", label: "Reviews", icon: "✅" },
      { id: "messages", label: "Messages", icon: "💬" },
      { id: "oracle", label: "Oracle AI", icon: "🤖" },
      { id: "analytics", label: "Analytics", icon: "📈" }
    ],
    lead: [
      { id: "dashboard", label: "Dashboard", icon: "📊" },
      { id: "users", label: "User Management", icon: "👤" },
      { id: "teams", label: "Teams", icon: "👥" },
      { id: "access", label: "Access Codes", icon: "🔑" },
      { id: "messages", label: "Messages", icon: "💬" },
      { id: "oracle", label: "Oracle AI", icon: "🤖" },
      { id: "analytics", label: "Analytics", icon: "📈" },
      { id: "settings", label: "Settings", icon: "⚙️" }
    ],
    guest: [
      { id: "dashboard", label: "Dashboard", icon: "📊" },
      { id: "public", label: "Public Updates", icon: "🌐" },
      { id: "faq", label: "FAQ", icon: "❓" }
    ]
  }

  const navItems = navigation[role] || []

  return (
    <aside className={cn(
      "w-64 bg-card border-r min-h-screen p-4 space-y-2",
      className
    )}>
      <div className="space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 h-10"
            onClick={() => onSectionChange?.(item.id)}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </Button>
        ))}
      </div>
    </aside>
  )
}