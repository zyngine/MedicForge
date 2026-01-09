import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import {
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  Users,
  Clock,
  Smartphone,
  Video,
  FileText,
  MessageSquare,
  Bell,
  Calendar,
  Shield,
  Zap,
  Globe,
  CheckCircle,
} from "lucide-react";

const featureCategories = [
  {
    title: "Course Management",
    description: "Build and deliver engaging EMS courses",
    features: [
      {
        icon: <GraduationCap className="h-6 w-6" />,
        title: "Comprehensive Course Builder",
        description:
          "Create courses with modules, lessons, and multiple content types. Drag-and-drop organization makes it easy to structure your curriculum.",
      },
      {
        icon: <Video className="h-6 w-6" />,
        title: "Video Integration",
        description:
          "Embed videos from YouTube, Vimeo, or upload directly. Track student viewing progress and engagement.",
      },
      {
        icon: <FileText className="h-6 w-6" />,
        title: "Document Support",
        description:
          "Upload PDFs, Word documents, and presentations. Built-in document viewer for seamless access.",
      },
      {
        icon: <ClipboardCheck className="h-6 w-6" />,
        title: "Assignment Types",
        description:
          "Quizzes with auto-grading, written assignments, skill checklists, and discussion boards.",
      },
    ],
  },
  {
    title: "NREMT Competency Tracking",
    description: "Track everything required for certification",
    features: [
      {
        icon: <ClipboardCheck className="h-6 w-6" />,
        title: "Skill Checklists",
        description:
          "Digital skill sheets aligned with NREMT requirements. Track attempts, passes, and areas needing improvement.",
      },
      {
        icon: <Clock className="h-6 w-6" />,
        title: "Clinical Hours Logging",
        description:
          "Students log clinical hours and patient contacts. Instructors verify and approve submissions.",
      },
      {
        icon: <Users className="h-6 w-6" />,
        title: "Patient Contact Tracking",
        description:
          "Record patient demographics, chief complaints, and procedures performed during clinical rotations.",
      },
      {
        icon: <CheckCircle className="h-6 w-6" />,
        title: "Competency Reports",
        description:
          "Generate reports showing student progress toward certification requirements.",
      },
    ],
  },
  {
    title: "Grading & Assessment",
    description: "Powerful tools for evaluating student performance",
    features: [
      {
        icon: <Zap className="h-6 w-6" />,
        title: "Auto-Grading",
        description:
          "Quizzes are graded automatically with instant feedback. Save hours of manual grading time.",
      },
      {
        icon: <BarChart3 className="h-6 w-6" />,
        title: "Curve Grading",
        description:
          "Apply bell curve, square root, linear, or flat bonus curves. Preview results before applying.",
      },
      {
        icon: <FileText className="h-6 w-6" />,
        title: "Rubric Builder",
        description:
          "Create detailed rubrics for written assignments. Consistent grading across all submissions.",
      },
      {
        icon: <MessageSquare className="h-6 w-6" />,
        title: "Inline Feedback",
        description:
          "Provide detailed feedback directly on student submissions. Help students learn from mistakes.",
      },
    ],
  },
  {
    title: "Communication & Engagement",
    description: "Keep students informed and engaged",
    features: [
      {
        icon: <Bell className="h-6 w-6" />,
        title: "Notifications",
        description:
          "Real-time notifications for assignments, grades, and announcements. Email and in-app alerts.",
      },
      {
        icon: <MessageSquare className="h-6 w-6" />,
        title: "Discussion Forums",
        description:
          "Course-specific discussion boards. Foster collaboration and peer learning.",
      },
      {
        icon: <Calendar className="h-6 w-6" />,
        title: "Calendar Integration",
        description:
          "View all assignments, classes, and events in one calendar. Sync with Google or Apple Calendar.",
      },
      {
        icon: <Users className="h-6 w-6" />,
        title: "Announcements",
        description:
          "Broadcast important updates to all students or specific courses. Pin critical announcements.",
      },
    ],
  },
  {
    title: "Platform Features",
    description: "Built for modern EMS education",
    features: [
      {
        icon: <Globe className="h-6 w-6" />,
        title: "Multi-Tenant Architecture",
        description:
          "Each institution gets their own isolated space. Custom branding, domains, and settings.",
      },
      {
        icon: <Smartphone className="h-6 w-6" />,
        title: "Mobile-Ready PWA",
        description:
          "Access courses from any device. Offline support for reviewing materials without internet.",
      },
      {
        icon: <Shield className="h-6 w-6" />,
        title: "Security & Privacy",
        description:
          "Role-based access control. Data encryption at rest and in transit. FERPA compliant.",
      },
      {
        icon: <BarChart3 className="h-6 w-6" />,
        title: "Analytics Dashboard",
        description:
          "Track student progress, engagement, and performance. Identify at-risk students early.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Features
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Everything You Need for EMS Education
            </h1>
            <p className="text-xl text-muted-foreground">
              MedicForge is built from the ground up for EMS training programs.
              Every feature is designed to help you train better first responders.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, categoryIndex) => (
        <section
          key={categoryIndex}
          className={`py-20 ${categoryIndex % 2 === 1 ? "bg-muted/30" : ""}`}
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{category.title}</h2>
              <p className="text-lg text-muted-foreground">
                {category.description}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {category.features.map((feature, featureIndex) => (
                <Card key={featureIndex} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ))}
    </MarketingLayout>
  );
}
