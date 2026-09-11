import type { LucideIcon, LucideProps } from "lucide-react";
import {
  BarChart3,
  BookMarked,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  FileText,
  Globe,
  GripVertical,
  Info,
  Link,
  LogOut,
  Minus,
  Package,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Save,
  SquarePen,
  Eye,
  EyeOff,
  Search,
  ArrowUpDown,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

export type IconProps = LucideProps;

const defaults = { size: 18, strokeWidth: 1.85, "aria-hidden": true as const };

function withDefaults(Icon: LucideIcon) {
  return function AppIcon({ size = defaults.size, strokeWidth = defaults.strokeWidth, ...props }: IconProps) {
    return <Icon size={size} strokeWidth={strokeWidth} aria-hidden={defaults["aria-hidden"]} {...props} />;
  };
}

export const IconOpen = withDefaults(ExternalLink);
export const IconPractice = withDefaults(ClipboardList);
export const IconTrash = withDefaults(Trash2);
export const IconSave = withDefaults(Save);
export const IconRefresh = withDefaults(RefreshCw);
export const IconEdit = withDefaults(SquarePen);
export const IconPencil = withDefaults(Pencil);
export const IconCheck = withDefaults(Check);
export const IconPin = withDefaults(Pin);
export const IconUp = withDefaults(ChevronUp);
export const IconDown = withDefaults(ChevronDown);
export const IconUpload = withDefaults(Upload);
export const IconClose = withDefaults(X);
export const IconKits = withDefaults(Package);
export const IconPlus = withDefaults(Plus);
export const IconLogout = withDefaults(LogOut);
export const IconFileText = withDefaults(FileText);
export const IconLink = withDefaults(Link);
export const IconCalendar = withDefaults(Calendar);
export const IconSpark = withDefaults(Sparkles);
export const IconChart = withDefaults(BarChart3);
export const IconVideo = withDefaults(Video);
export const IconSearch = withDefaults(Search);
export const IconEye = withDefaults(Eye);
export const IconEyeOff = withDefaults(EyeOff);
export const IconSort = withDefaults(ArrowUpDown);
export const IconGlobe = withDefaults(Globe);
export const IconInfo = withDefaults(Info);
export const IconMinus = withDefaults(Minus);
export const IconGrip = withDefaults(GripVertical);
export const IconMark = withDefaults(BookMarked);
