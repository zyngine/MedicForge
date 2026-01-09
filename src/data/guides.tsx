import { BookOpen, Video, ClipboardCheck, Users, BarChart3, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";

export interface Guide {
  slug: string;
  icon: ReactNode;
  title: string;
  description: string;
  readTime: string;
  content: ReactNode;
}

export const guides: Guide[] = [
  {
    slug: "getting-started",
    icon: <BookOpen className="h-6 w-6" />,
    title: "Getting Started with MedicForge",
    description: "A complete walkthrough of setting up your account and creating your first course.",
    readTime: "10 min read",
    content: (
      <>
        <h2>Welcome to MedicForge</h2>
        <p>
          MedicForge is designed specifically for EMS education programs. Whether you&apos;re running an EMT,
          AEMT, or Paramedic course, this guide will help you get up and running quickly.
        </p>

        <h3>Step 1: Create Your Account</h3>
        <p>
          Start by registering your organization. You&apos;ll need to provide:
        </p>
        <ul>
          <li>Your organization name (e.g., &quot;Springfield Fire Academy&quot;)</li>
          <li>Your email address</li>
          <li>A secure password</li>
        </ul>
        <p>
          After registration, you&apos;ll receive a confirmation email. Click the link to verify your account.
        </p>

        <h3>Step 2: Set Up Your Organization</h3>
        <p>
          Once logged in, navigate to <strong>Admin &gt; Settings</strong> to customize your organization:
        </p>
        <ul>
          <li><strong>Logo:</strong> Upload your organization&apos;s logo for branding</li>
          <li><strong>Primary Color:</strong> Choose a theme color that matches your brand</li>
          <li><strong>Custom Domain:</strong> (Pro/Institution plans) Set up a custom subdomain</li>
        </ul>

        <h3>Step 3: Create Your First Course</h3>
        <p>
          Navigate to <strong>Instructor &gt; Courses</strong> and click <strong>Create Course</strong>. You&apos;ll need to:
        </p>
        <ol>
          <li>Enter a course title (e.g., &quot;EMT Basic - Spring 2024&quot;)</li>
          <li>Select the course type (EMR, EMT, AEMT, or Paramedic)</li>
          <li>Set start and end dates</li>
          <li>Set maximum enrollment (optional)</li>
        </ol>
        <p>
          MedicForge will automatically generate an enrollment code that students can use to join your course.
        </p>

        <h3>Step 4: Add Course Content</h3>
        <p>
          Your course is organized into <strong>Modules</strong>, each containing <strong>Lessons</strong> and <strong>Assignments</strong>.
        </p>
        <p>
          Click on your course, then <strong>Add Module</strong> to create your first module. Common module structures include:
        </p>
        <ul>
          <li>Module 1: Preparatory (EMS Systems, Workforce Safety)</li>
          <li>Module 2: Airway Management</li>
          <li>Module 3: Patient Assessment</li>
          <li>Module 4: Medical Emergencies</li>
          <li>Module 5: Trauma</li>
        </ul>

        <h3>Step 5: Invite Students</h3>
        <p>
          Share your enrollment code with students. They can join by:
        </p>
        <ol>
          <li>Creating an account on MedicForge</li>
          <li>Clicking <strong>Join Course</strong></li>
          <li>Entering the enrollment code</li>
        </ol>
        <p>
          Alternatively, you can bulk import students via CSV in <strong>Admin &gt; Users</strong>.
        </p>

        <h3>Next Steps</h3>
        <p>
          Now that your course is set up, explore these guides to add rich content:
        </p>
        <ul>
          <li>Adding Video Content</li>
          <li>Building Effective Quizzes</li>
          <li>NREMT Competency Tracking</li>
        </ul>
      </>
    ),
  },
  {
    slug: "adding-video-content",
    icon: <Video className="h-6 w-6" />,
    title: "Adding Video Content",
    description: "Learn how to embed videos from YouTube, Vimeo, or upload your own content.",
    readTime: "5 min read",
    content: (
      <>
        <h2>Video Content in MedicForge</h2>
        <p>
          Video is one of the most effective ways to teach EMS procedures and scenarios.
          MedicForge supports multiple video sources to give you flexibility in how you deliver content.
        </p>

        <h3>Supported Video Sources</h3>
        <ul>
          <li><strong>YouTube:</strong> Embed any public or unlisted YouTube video</li>
          <li><strong>Vimeo:</strong> Embed Vimeo videos with privacy controls</li>
          <li><strong>Direct Upload:</strong> Upload MP4 files directly (size limits apply based on plan)</li>
        </ul>

        <h3>Adding a YouTube Video</h3>
        <ol>
          <li>Navigate to your course and select a module</li>
          <li>Click <strong>Add Lesson</strong></li>
          <li>Select <strong>Video</strong> as the content type</li>
          <li>Paste the YouTube URL (e.g., https://youtube.com/watch?v=...)</li>
          <li>Add a title and description</li>
          <li>Click <strong>Save</strong></li>
        </ol>
        <p>
          The video will be embedded directly in the lesson, and student viewing progress will be tracked automatically.
        </p>

        <h3>Adding a Vimeo Video</h3>
        <p>
          The process is the same as YouTube. Simply paste the Vimeo URL and MedicForge will handle the embedding.
        </p>
        <p>
          <strong>Pro tip:</strong> Use Vimeo&apos;s privacy settings to restrict videos to only be viewable
          when embedded on MedicForge.
        </p>

        <h3>Uploading Your Own Videos</h3>
        <ol>
          <li>Navigate to your course and select a module</li>
          <li>Click <strong>Add Lesson</strong></li>
          <li>Select <strong>Video</strong> as the content type</li>
          <li>Click <strong>Upload Video</strong></li>
          <li>Select an MP4 file from your computer</li>
          <li>Wait for the upload to complete</li>
          <li>Add a title and description</li>
          <li>Click <strong>Save</strong></li>
        </ol>

        <h3>Video Upload Limits</h3>
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Max File Size</th>
              <th>Total Storage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Free</td>
              <td>100 MB</td>
              <td>1 GB</td>
            </tr>
            <tr>
              <td>Professional</td>
              <td>500 MB</td>
              <td>25 GB</td>
            </tr>
            <tr>
              <td>Institution</td>
              <td>2 GB</td>
              <td>100 GB</td>
            </tr>
          </tbody>
        </table>

        <h3>Best Practices</h3>
        <ul>
          <li><strong>Keep videos under 15 minutes:</strong> Shorter videos improve retention</li>
          <li><strong>Use chapters:</strong> Break long procedures into multiple short videos</li>
          <li><strong>Add captions:</strong> YouTube auto-generates captions; review them for accuracy</li>
          <li><strong>Compress before upload:</strong> Use HandBrake or similar tools to reduce file size</li>
        </ul>
      </>
    ),
  },
  {
    slug: "building-quizzes",
    icon: <ClipboardCheck className="h-6 w-6" />,
    title: "Building Effective Quizzes",
    description: "Best practices for creating quizzes that assess student knowledge effectively.",
    readTime: "8 min read",
    content: (
      <>
        <h2>Creating Quizzes in MedicForge</h2>
        <p>
          Quizzes are essential for assessing student knowledge and preparing them for certification exams.
          MedicForge&apos;s quiz builder supports multiple question types and automatic grading.
        </p>

        <h3>Question Types</h3>
        <ul>
          <li><strong>Multiple Choice:</strong> Single correct answer from 4-5 options</li>
          <li><strong>True/False:</strong> Binary choice questions</li>
          <li><strong>Multiple Select:</strong> Multiple correct answers (select all that apply)</li>
          <li><strong>Short Answer:</strong> Free-text response (manually graded)</li>
        </ul>

        <h3>Creating a Quiz</h3>
        <ol>
          <li>Navigate to your course module</li>
          <li>Click <strong>Add Assignment</strong></li>
          <li>Select <strong>Quiz</strong> as the type</li>
          <li>Set the quiz parameters:
            <ul>
              <li>Points possible</li>
              <li>Time limit (optional)</li>
              <li>Number of attempts allowed</li>
              <li>Due date</li>
            </ul>
          </li>
          <li>Click <strong>Add Questions</strong></li>
        </ol>

        <h3>Adding Multiple Choice Questions</h3>
        <ol>
          <li>Click <strong>Add Question</strong> and select <strong>Multiple Choice</strong></li>
          <li>Enter the question text</li>
          <li>Add 4-5 answer options</li>
          <li>Mark the correct answer</li>
          <li>Add an explanation (shown after submission)</li>
          <li>Set the point value</li>
        </ol>

        <h3>Writing Effective Questions</h3>
        <p>Follow these guidelines for high-quality assessment questions:</p>
        <ul>
          <li><strong>Be specific:</strong> Avoid vague language like &quot;sometimes&quot; or &quot;usually&quot;</li>
          <li><strong>One correct answer:</strong> Ensure only one option is definitively correct</li>
          <li><strong>Avoid &quot;All of the above&quot;:</strong> These are often too easy</li>
          <li><strong>Use clinical scenarios:</strong> Present realistic patient situations</li>
          <li><strong>Match NREMT style:</strong> Use similar wording to certification exams</li>
        </ul>

        <h3>Example Question</h3>
        <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
          <p><strong>Question:</strong></p>
          <p>
            You arrive on scene to find a 45-year-old male complaining of chest pain.
            He is diaphoretic and states the pain radiates to his left arm.
            His vital signs are: BP 160/100, HR 110, RR 22, SpO2 94% on room air.
            What is your FIRST priority?
          </p>
          <p><strong>Options:</strong></p>
          <ol type="A">
            <li>Administer aspirin</li>
            <li>Apply high-flow oxygen</li>
            <li>Obtain a 12-lead ECG</li>
            <li>Establish IV access</li>
          </ol>
          <p><strong>Correct Answer:</strong> B - Apply high-flow oxygen</p>
          <p><strong>Explanation:</strong> While all interventions are appropriate, the patient&apos;s SpO2 of 94%
          indicates hypoxia. Correcting hypoxia is the first priority to reduce myocardial oxygen demand.</p>
        </div>

        <h3>Quiz Settings</h3>
        <ul>
          <li><strong>Time Limit:</strong> Set a time limit to simulate exam conditions</li>
          <li><strong>Randomization:</strong> Randomize question order to prevent cheating</li>
          <li><strong>Multiple Attempts:</strong> Allow retakes for practice quizzes</li>
          <li><strong>Show Results:</strong> Choose when to reveal correct answers</li>
        </ul>

        <h3>Using the Question Bank</h3>
        <p>
          Build a reusable question bank by saving questions. You can then quickly assemble new quizzes
          by selecting from your existing questions.
        </p>
      </>
    ),
  },
  {
    slug: "managing-students",
    icon: <Users className="h-6 w-6" />,
    title: "Managing Students & Enrollments",
    description: "How to add students, create enrollment codes, and manage class rosters.",
    readTime: "6 min read",
    content: (
      <>
        <h2>Student Management</h2>
        <p>
          MedicForge provides flexible options for managing students, from self-enrollment
          to bulk imports and manual additions.
        </p>

        <h3>Enrollment Codes</h3>
        <p>
          Each course has a unique enrollment code that students can use to join.
          Find the code in <strong>Course Settings</strong>.
        </p>
        <ul>
          <li>Share the code in class or via email</li>
          <li>Students enter the code when joining a course</li>
          <li>You can regenerate the code if it gets shared publicly</li>
        </ul>

        <h3>Self-Enrollment Process</h3>
        <p>Students follow these steps to enroll:</p>
        <ol>
          <li>Create a MedicForge account</li>
          <li>Click <strong>Join Course</strong> on their dashboard</li>
          <li>Enter the enrollment code</li>
          <li>They&apos;re immediately added to the course</li>
        </ol>

        <h3>Bulk Import via CSV</h3>
        <p>
          For larger classes, import students from a CSV file:
        </p>
        <ol>
          <li>Go to <strong>Admin &gt; Users</strong></li>
          <li>Click <strong>Import Users</strong></li>
          <li>Download the CSV template</li>
          <li>Fill in student information:
            <ul>
              <li>Email (required)</li>
              <li>Full Name (required)</li>
              <li>Phone (optional)</li>
            </ul>
          </li>
          <li>Upload the completed CSV</li>
          <li>Select the course(s) to enroll them in</li>
        </ol>
        <p>
          Students will receive an email invitation with instructions to set their password.
        </p>

        <h3>Manual Student Addition</h3>
        <ol>
          <li>Go to <strong>Course &gt; Students</strong></li>
          <li>Click <strong>Add Student</strong></li>
          <li>Enter the student&apos;s email</li>
          <li>If they already have an account, they&apos;ll be enrolled immediately</li>
          <li>If not, they&apos;ll receive an invitation email</li>
        </ol>

        <h3>Managing Student Status</h3>
        <p>From the student roster, you can:</p>
        <ul>
          <li><strong>View Progress:</strong> See completion percentage and grades</li>
          <li><strong>Send Message:</strong> Email individual students</li>
          <li><strong>Drop Student:</strong> Remove from course (preserves records)</li>
          <li><strong>Mark Complete:</strong> Manually complete the course</li>
        </ul>

        <h3>At-Risk Students</h3>
        <p>
          MedicForge automatically identifies at-risk students based on:
        </p>
        <ul>
          <li>Missing assignments</li>
          <li>Low quiz scores</li>
          <li>Inactivity (no login in 7+ days)</li>
          <li>Incomplete clinical hours</li>
        </ul>
        <p>
          View at-risk students on your <strong>Instructor Dashboard</strong> to intervene early.
        </p>

        <h3>Student Roles</h3>
        <ul>
          <li><strong>Student:</strong> Default role, can view content and submit assignments</li>
          <li><strong>TA (Teaching Assistant):</strong> Can view all submissions and assist with grading</li>
          <li><strong>Auditor:</strong> Can view content but cannot submit assignments</li>
        </ul>
      </>
    ),
  },
  {
    slug: "nremt-tracking",
    icon: <Stethoscope className="h-6 w-6" />,
    title: "NREMT Competency Tracking",
    description: "Track skills, clinical hours, and patient contacts for certification.",
    readTime: "12 min read",
    content: (
      <>
        <h2>NREMT Competency Tracking</h2>
        <p>
          MedicForge includes comprehensive tracking for all NREMT certification requirements,
          including psychomotor skills, clinical hours, and patient contacts.
        </p>

        <h3>Overview of Requirements</h3>
        <p>NREMT certification requires students to demonstrate competency in multiple areas:</p>
        <ul>
          <li><strong>Psychomotor Skills:</strong> Hands-on skill evaluations</li>
          <li><strong>Clinical Hours:</strong> Time spent in clinical settings</li>
          <li><strong>Patient Contacts:</strong> Documented patient interactions</li>
          <li><strong>Team Leads:</strong> Experiences leading patient care</li>
        </ul>

        <h3>Setting Up Skill Categories</h3>
        <p>MedicForge comes pre-configured with NREMT skill categories. To customize:</p>
        <ol>
          <li>Go to <strong>Course Settings &gt; Competencies</strong></li>
          <li>Review the default skill categories:
            <ul>
              <li>Airway Management</li>
              <li>Patient Assessment</li>
              <li>Cardiac (BLS/ALS)</li>
              <li>IV/IO Access</li>
              <li>Trauma</li>
              <li>Medical</li>
            </ul>
          </li>
          <li>Adjust required counts based on your state requirements</li>
          <li>Add custom skills if needed</li>
        </ol>

        <h3>Recording Skill Attempts</h3>
        <p>Instructors can record skill evaluations:</p>
        <ol>
          <li>Go to <strong>Course &gt; Competencies</strong></li>
          <li>Select a student</li>
          <li>Click <strong>Record Skill Attempt</strong></li>
          <li>Select the skill being evaluated</li>
          <li>Complete the step-by-step checklist</li>
          <li>Mark as <strong>Pass</strong>, <strong>Fail</strong>, or <strong>Needs Practice</strong></li>
          <li>Add feedback notes</li>
        </ol>

        <h3>Clinical Site Management</h3>
        <p>Set up clinical sites where students complete rotations:</p>
        <ol>
          <li>Go to <strong>Instructor &gt; Clinical &gt; Sites</strong></li>
          <li>Click <strong>Add Site</strong></li>
          <li>Enter site details:
            <ul>
              <li>Name (e.g., &quot;Memorial Hospital ER&quot;)</li>
              <li>Type (Hospital, Ambulance, Fire Dept)</li>
              <li>Address and contact info</li>
              <li>Preceptor information</li>
            </ul>
          </li>
        </ol>

        <h3>Creating Clinical Shifts</h3>
        <ol>
          <li>Go to <strong>Instructor &gt; Clinical &gt; Shifts</strong></li>
          <li>Click <strong>Create Shift</strong></li>
          <li>Select the clinical site</li>
          <li>Set date, start time, and end time</li>
          <li>Set capacity (number of students)</li>
          <li>Optionally restrict to specific courses</li>
        </ol>
        <p>
          Students can then book available shifts on a first-come, first-served basis.
        </p>

        <h3>Student Clinical Documentation</h3>
        <p>Students document their clinical experiences:</p>
        <ol>
          <li>Check in to their booked shift</li>
          <li>Document patient contacts throughout the shift</li>
          <li>For each patient, record:
            <ul>
              <li>Patient demographics (age range, gender)</li>
              <li>Chief complaint and impressions</li>
              <li>Vital signs (multiple sets)</li>
              <li>Skills performed</li>
              <li>Medications administered</li>
              <li>Role (team lead vs. team member)</li>
              <li>Narrative summary</li>
            </ul>
          </li>
          <li>Check out with preceptor signature</li>
        </ol>

        <h3>Instructor Verification</h3>
        <p>Patient contacts require instructor verification:</p>
        <ol>
          <li>Go to <strong>Instructor &gt; Clinical &gt; Patient Contacts</strong></li>
          <li>Review pending contacts</li>
          <li>Verify accuracy and completeness</li>
          <li>Approve or request corrections</li>
        </ol>

        <h3>Competency Reports</h3>
        <p>Generate reports for certification documentation:</p>
        <ul>
          <li><strong>Individual Student Report:</strong> Complete competency summary</li>
          <li><strong>Class Progress Report:</strong> Overview of all students</li>
          <li><strong>Clinical Hours Summary:</strong> Hours by site and date</li>
          <li><strong>Patient Contact Log:</strong> Detailed contact records</li>
        </ul>
        <p>
          Reports can be exported as PDF for submission to state EMS offices.
        </p>

        <h3>Age Group Requirements</h3>
        <p>Track patient contacts across required age groups:</p>
        <ul>
          <li>Neonate (0-1 month)</li>
          <li>Infant (1 month - 1 year)</li>
          <li>Toddler (1-3 years)</li>
          <li>Preschool (3-5 years)</li>
          <li>School Age (6-12 years)</li>
          <li>Adolescent (13-17 years)</li>
          <li>Adult (18-64 years)</li>
          <li>Geriatric (65+ years)</li>
        </ul>
      </>
    ),
  },
  {
    slug: "curve-grading",
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Using Curve Grading",
    description: "Apply bell curve, square root, or linear curves to assignment grades.",
    readTime: "7 min read",
    content: (
      <>
        <h2>Curve Grading in MedicForge</h2>
        <p>
          MedicForge includes powerful grade curving tools to help normalize scores
          when an assignment is particularly difficult or to ensure fair grading.
        </p>

        <h3>Available Curve Methods</h3>

        <h4>1. Bell Curve (Normal Distribution)</h4>
        <p>
          Adjusts all scores so the class average equals your target mean.
        </p>
        <ul>
          <li><strong>Best for:</strong> Standardizing scores to a known average</li>
          <li><strong>Example:</strong> If class average is 72% and you want 80%, all scores shift up by 8 points</li>
        </ul>

        <h4>2. Square Root Curve</h4>
        <p>
          Applies the formula: <code>New Score = √(Raw Score / Max) × Max</code>
        </p>
        <ul>
          <li><strong>Best for:</strong> Difficult exams where most students scored low</li>
          <li><strong>Effect:</strong> Helps lower scores more than higher scores</li>
          <li><strong>Example:</strong> 64% becomes 80%, 81% becomes 90%</li>
        </ul>

        <h4>3. Linear Curve</h4>
        <p>
          Scales all scores so the highest score becomes 100%.
        </p>
        <ul>
          <li><strong>Best for:</strong> When no one achieved a perfect score</li>
          <li><strong>Example:</strong> If top score is 92%, multiply all scores by 1.087</li>
        </ul>

        <h4>4. Flat Bonus</h4>
        <p>
          Adds a fixed number of points to all scores.
        </p>
        <ul>
          <li><strong>Best for:</strong> Simple adjustments for a single difficult question</li>
          <li><strong>Example:</strong> Add 5 points to everyone&apos;s score</li>
        </ul>

        <h3>Applying a Curve</h3>
        <ol>
          <li>Go to <strong>Instructor &gt; Grading</strong></li>
          <li>Select the assignment</li>
          <li>Click <strong>Apply Curve</strong></li>
          <li>Choose your curve method</li>
          <li>Preview the results:
            <ul>
              <li>See before/after comparison</li>
              <li>View grade distribution chart</li>
              <li>Check individual student impact</li>
            </ul>
          </li>
          <li>Click <strong>Apply</strong> to save the curved grades</li>
        </ol>

        <h3>Understanding the Preview</h3>
        <p>Before applying a curve, MedicForge shows you:</p>
        <ul>
          <li><strong>Original Statistics:</strong> Mean, median, standard deviation</li>
          <li><strong>Curved Statistics:</strong> New mean, median, standard deviation</li>
          <li><strong>Distribution Chart:</strong> Visual comparison of grade distributions</li>
          <li><strong>Sample Students:</strong> How specific scores will change</li>
        </ul>

        <h3>Curve Grading Best Practices</h3>
        <ul>
          <li><strong>Be consistent:</strong> Apply the same curve to all sections of a course</li>
          <li><strong>Document your reasoning:</strong> Add notes explaining why a curve was applied</li>
          <li><strong>Consider alternatives:</strong> Sometimes dropping a question is better than curving</li>
          <li><strong>Communicate with students:</strong> Let them know when and why curves are applied</li>
        </ul>

        <h3>When NOT to Curve</h3>
        <ul>
          <li><strong>Competency-based assessments:</strong> Students must demonstrate actual competency</li>
          <li><strong>NREMT practice exams:</strong> Scores should reflect actual preparedness</li>
          <li><strong>Skill evaluations:</strong> Pass/fail should be based on performance</li>
        </ul>

        <h3>Viewing Curved vs. Raw Scores</h3>
        <p>
          MedicForge always preserves original scores. In the gradebook, you can toggle between:
        </p>
        <ul>
          <li><strong>Raw Score:</strong> Original score before curving</li>
          <li><strong>Curved Score:</strong> Adjusted score after curving</li>
          <li><strong>Final Score:</strong> The score used for the gradebook (usually curved)</li>
        </ul>

        <h3>Exporting Grades</h3>
        <p>
          When exporting grades, you can choose to include raw scores, curved scores, or both.
          This is useful for maintaining records and transparency.
        </p>
      </>
    ),
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}
