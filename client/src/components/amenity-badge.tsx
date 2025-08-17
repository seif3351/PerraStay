import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface AmenityBadgeProps {
  icon?: React.ReactNode;
  label: string;
  verified?: boolean;
  variant?: "green" | "blue" | "purple" | "orange" | "red" | "default";
}

export default function AmenityBadge({ icon, label, verified, variant = "default" }: AmenityBadgeProps) {
  const variants = {
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800", 
    purple: "bg-purple-100 text-purple-800",
    orange: "bg-orange-100 text-orange-800",
    red: "bg-red-100 text-red-800",
    default: "bg-gray-100 text-gray-800"
  };

  return (
    <Badge className={`${variants[variant]} px-2 py-1 rounded text-xs font-medium flex items-center gap-1`}>
      {icon}
      {label}
      {verified && <CheckCircle className="w-3 h-3 ml-1" />}
    </Badge>
  );
}
