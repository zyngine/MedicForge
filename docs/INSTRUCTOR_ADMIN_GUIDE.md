# MedicForge Instructor & Admin Guide

A comprehensive How-To guide for instructors and administrators.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Course Management](#course-management)
3. [Modules & Content](#modules--content)
4. [Assignments & Quizzes](#assignments--quizzes)
5. [Exams & CAT Testing](#exams--cat-testing)
6. [Question Bank](#question-bank)
7. [Grading](#grading)
8. [Student Management](#student-management)
9. [Analytics & Reports](#analytics--reports)
10. [Clinical Management](#clinical-management)
11. [Communication](#communication)
12. [Admin: User Management](#admin-user-management)
13. [Admin: Organization Settings](#admin-organization-settings)
14. [Admin: Billing & Subscriptions](#admin-billing--subscriptions)
15. [Troubleshooting](#troubleshooting)

---

## Getting Started

### How do I log in?

1. Go to your organization's MedicForge URL
2. Enter your email and password
3. Click "Sign in"
4. You'll be redirected to your dashboard based on your role

### How do I reset my password?

1. On the login page, click "Forgot password?"
2. Enter your email address
3. Check your email for a reset link
4. Click the link and enter a new password

### What's the difference between Instructor and Admin roles?

| Role | Access |
|------|--------|
| **Instructor** | Manage own courses, grade students, create content, view enrolled students |
| **Admin** | Everything instructors can do PLUS manage users, organization settings, billing, and all courses |

---

## Course Management

### How do I create a new course?

1. Go to **My Courses** (`/instructor/courses`)
2. Click **"Create Course"**
3. Fill in the details:
   - **Title** (required): e.g., "EMT Basic - Spring 2024"
   - **Course Type**: EMR, EMT, AEMT, Paramedic, or Custom
   - **Course Code** (optional): e.g., "EMT-101"
   - **Description**: What students will learn
   - **Start/End Dates**: When the course runs
   - **Max Students**: Enrollment limit (leave blank for unlimited)
4. Click **Save**
5. An **enrollment code** is automatically generated for students to join

### How do students enroll in my course?

Students can enroll using the **enrollment code**:
1. Go to your course and copy the enrollment code (e.g., "ABC123")
2. Share this code with students
3. Students go to their dashboard and click "Join Course"
4. They enter the code and are enrolled

### How do I edit a course?

1. Go to **My Courses**
2. Click on the course you want to edit
3. Go to the **Overview** tab
4. Make your changes and click **Save**

### How do I archive a course?

1. Go to **My Courses**
2. Find the course and click the **three-dot menu** (⋮)
3. Select **Archive**
4. The course is hidden from students but data is preserved

### How do I add instructors to my course?

1. Go to your course
2. Click the **Instructors** tab
3. Click **"Add Instructor"**
4. Search for the instructor by name or email
5. Select their role:
   - **Lead Instructor**: Full control, can add/remove other instructors
   - **Course Coordinator**: Manages logistics and scheduling
   - **Instructor**: Can teach and grade
   - **Teaching Assistant**: Helps with instruction and grading
   - **Grader**: Can only grade submissions
6. Click to add them

---

## Modules & Content

### What is a module?

A **module** is a container for organizing your course content. Think of it as a chapter or unit. Each module can contain:
- Lessons (text, video, documents)
- Assignments
- Quizzes

### How do I create a module?

1. Go to your course
2. Click the **Modules** tab
3. Click **"Add Module"**
4. Enter a title (e.g., "Module 1: Patient Assessment")
5. Add an optional description
6. Click **Save**

### How do I add content to a module?

1. Go to your course → **Modules** tab
2. Click on a module to expand it
3. Click **"Add Lesson"** or **"Add Assignment"**
4. Choose the content type:
   - **Text**: Write content directly
   - **Video**: Upload or embed video
   - **Document**: Upload PDF, Word, etc.
   - **Quiz**: Create quiz questions
5. Fill in the details and save

### How do I reorder modules or lessons?

1. Go to the **Modules** tab
2. Drag and drop modules/lessons to reorder them
3. Changes are saved automatically

---

## Assignments & Quizzes

### How do I create a quiz assignment?

1. Go to your course → **Modules** tab
2. Click **"Add Assignment"** or go to `/instructor/courses/[courseId]/assignments/new`
3. Select **"Quiz"** as the assignment type
4. Fill in:
   - **Title**: Name of the quiz
   - **Description**: Instructions for students
   - **Module**: Which module this belongs to (required)
   - **Due Date**: When it's due
5. Add questions:
   - Click **"Add Question"**
   - Choose type: Multiple Choice, True/False, Short Answer, Matching
   - Enter the question and answers
   - Set point value
6. Configure settings:
   - **Time Limit**: Optional time restriction
   - **Attempts**: How many times students can try
   - **Shuffle Questions**: Randomize order
   - **Show Correct Answers**: After submission
7. Click **Save Assignment**

### How do I use a quiz template?

If you've saved quizzes as templates before:
1. When creating a quiz, click **"Use Template"**
2. Browse your template library
3. Search or filter by certification level
4. Click **"Use"** on the template you want
5. The quiz is populated with all questions and settings
6. Modify if needed and save

### How do I save a quiz as a template?

1. Create or open a quiz with questions
2. Click **"Save as Template"**
3. Enter a template name (e.g., "EMT Module 3 Quiz")
4. Add optional description and tags
5. Select certification level (EMR, EMT, AEMT, Paramedic)
6. Click **Save Template**

Templates are available across all your courses!

### How do I create a written assignment?

1. Create a new assignment
2. Select **"Written Assignment"**
3. Configure:
   - Allow text submission
   - Allow file upload
   - Accepted file types (.pdf, .doc, .docx)
   - Maximum file size
4. Set rubric (optional)
5. Save

### How do I create a skill checklist?

1. Create a new assignment
2. Select **"Skill Checklist"**
3. Add steps that students must demonstrate
4. Each step can be marked as:
   - Completed
   - Needs Improvement
   - Not Attempted
5. Save

---

## Exams & CAT Testing

### What's the difference between standard exams and CAT?

| Standard Exam | CAT (Computer Adaptive Testing) |
|--------------|--------------------------------|
| Fixed number of questions | Variable questions (e.g., 70-120) |
| All students get same questions | Questions adapt to student ability |
| Score based on % correct | Score based on IRT theta (ability estimate) |
| Good for unit tests | Mimics NREMT certification exam |

### How do I create an exam?

1. Go to **Exams & CAT** (`/instructor/exams`)
2. Click **"Create Exam"**
3. Select a template (see below for creating templates)
4. Set:
   - Exam title
   - Available from/until dates
   - Which course it's for
5. Save (creates as draft)
6. Click **Publish** when ready for students

### How do I create an exam template?

1. Go to **Exams & CAT** → **Templates** tab
2. Click **"Create Template"**
3. Configure:
   - **Name**: e.g., "EMT Comprehensive CAT"
   - **Certification Level**: EMT, AEMT, Paramedic
   - **Exam Type**: Standard or Adaptive (CAT)
   - For Standard:
     - Total questions
     - Time limit
     - Passing score (%)
   - For CAT:
     - Min/max questions
     - Initial theta (0 = average ability)
     - Termination SE (lower = more precise, typically 0.30)
   - **Options**: Shuffle questions, show results, allow review
4. Set category weights (how questions are distributed by topic)
5. Save template

### How do I view exam results?

1. Go to **Exams & CAT**
2. Click on an exam
3. See list of all student attempts with:
   - Status (Passed/Failed/In Progress)
   - Score
   - Questions answered
   - Time spent
4. Click **"View Results"** on any attempt for detailed breakdown

### What exam templates are available?

System templates include:
- EMT Entrance Exam (standard, 100 questions)
- EMT Comprehensive CAT (adaptive, 70-120 questions)
- AEMT Entrance Exam (standard, 120 questions)
- AEMT Comprehensive CAT (adaptive, 75-135 questions)
- Paramedic Entrance Exam (standard, 150 questions)
- Paramedic Comprehensive CAT (adaptive, 80-150 questions)

---

## Question Bank

### What is the Question Bank?

The Question Bank is a centralized library of reusable questions. Questions can be:
- Used in multiple quizzes and exams
- Tagged by certification level and difficulty
- Tracked for usage statistics
- Validated before use

### How do I add questions to the Question Bank?

1. Go to **Question Bank** (`/instructor/question-bank`)
2. Click **"Add Question"**
3. Fill in:
   - Question text
   - Question type (Multiple Choice, True/False, etc.)
   - Answer options and correct answer
   - Explanation (shown after answering)
   - Category/topic
   - Certification level (EMR, EMT, AEMT, Paramedic)
   - Difficulty (Easy, Medium, Hard, Expert)
   - Point value
4. Save

### How do I import questions in bulk?

1. Go to **Question Bank**
2. Click **"Import"**
3. Download the CSV template
4. Fill in your questions following the template format
5. Upload the completed CSV
6. Review the preview
7. Click **Import**

### How do I use Question Bank questions in a quiz?

1. When building a quiz, click **"Import from Bank"**
2. Search or filter questions
3. Select questions to add
4. Click **Import Selected**
5. Questions are added to your quiz

---

## Grading

### How do I grade submissions?

1. Go to **Grading** (`/instructor/grading`)
2. See pending submissions in the list
3. Click on a submission to open it
4. For quizzes: See auto-graded score
5. Enter/adjust score (0 to max points)
6. Add feedback for the student
7. Click **Submit Grade**

### How do I request a revision?

1. Open a submission in the grading view
2. Instead of grading, click **"Request Revision"**
3. Enter feedback explaining what needs to be fixed
4. Submit
5. Student is notified and can resubmit

### How do I apply a grade curve?

1. Go to **Grading**
2. Click **"Apply Curve"**
3. Select which assignment(s) to curve
4. Choose a curve method:
   - **Bell Curve**: Adjusts to normal distribution
   - **Square Root**: sqrt(score) × 10
   - **Linear**: Scales to target mean
   - **Flat Bonus**: Adds fixed points to everyone
5. Preview the impact (before/after stats)
6. Click **Apply** to update all grades

### How do I view the gradebook?

1. Go to **Gradebook** (`/instructor/gradebook`)
2. Select a course
3. See all students with:
   - Name and email
   - Submission count
   - Average score
   - Letter grade
4. Click on any student for detailed grade breakdown

### How do I export grades?

1. Go to **Gradebook**
2. Select a course
3. Click **"Export"**
4. Choose format (CSV, JSON, XLSX)
5. Select fields to include:
   - Student info (name, email, ID)
   - Grades (raw, curved, final, percentage, letter)
   - Dates (submitted, graded, due)
   - Feedback
6. Click **Export**

---

## Student Management

### How do I view my students?

1. Go to **Students** (`/instructor/students`)
2. Select a course
3. See all enrolled students with:
   - Name and email
   - Progress (% completed)
   - Current grade
   - Status (Active, Completed, Dropped)

### How do I identify at-risk students?

1. Go to **Students**
2. Click **"At-Risk View"**
3. Students with <50% completion are highlighted
4. Click **"Contact"** to message them directly

### How do I remove a student from a course?

1. Go to your course → **Students** tab
2. Find the student
3. Click the **three-dot menu** (⋮)
4. Select **"Remove from Course"**
5. Confirm

### How do I export the student roster?

1. Go to **Students**
2. Select a course
3. Click **"Export Roster"**
4. CSV downloads with all student info

---

## Analytics & Reports

### How do I view course analytics?

1. Go to **Analytics** (`/instructor/analytics`)
2. Select a course
3. View:
   - **Summary Cards**: Students, engagement, avg score, completion rate
   - **Engagement Trend**: Daily active users over 30 days
   - **At-Risk Students**: Low engagement alerts
   - **Top Performers**: Leaderboard
   - **Daily Metrics**: Detailed table with export option

### What reports are available?

- **Course Reports**: Student progress, grade distribution
- **COAEMSP Reports**: Accreditation compliance data (`/instructor/reports/coaemsp`)
- **Engagement Reports**: Time spent, login frequency
- **Outcome Reports**: Learning objective achievement

### How do I export analytics data?

1. Go to **Analytics** or **Reports**
2. Select the report type
3. Click **"Export"**
4. Choose format and download

---

## Clinical Management

### How do I manage clinical sites?

1. Go to **Clinical** (`/instructor/clinical/sites`)
2. Add new sites with:
   - Site name
   - Address
   - Contact information
   - Available positions
   - Preceptor information

### How do I schedule clinical shifts?

1. Go to **Clinical** → **Shifts** (`/instructor/clinical/shifts`)
2. Click **"Create Shift"**
3. Select:
   - Clinical site
   - Date and time
   - Available spots
   - Preceptor
4. Save
5. Students can sign up for available shifts

### How do I track patient contacts?

1. Go to **Clinical** → **Patient Contacts**
2. View all logged patient contacts
3. Review and approve student submissions
4. Track contact types and competencies practiced

---

## Communication

### How do I send an announcement?

1. Go to **Announcements** (`/instructor/announcements`)
2. Click **"Create Announcement"**
3. Select course(s) to send to
4. Enter title and message
5. Choose to send immediately or schedule
6. Click **Post**

### How do I message students?

1. Go to **Messages** (`/instructor/messages`)
2. Click **"New Message"**
3. Select recipient(s)
4. Write your message
5. Send

### How do I manage course discussions?

1. Go to your course → **Discussions** tab
2. Create discussion threads
3. Pin important threads
4. Moderate posts (edit/delete if needed)
5. Reply to student posts

---

## Admin: User Management

### How do I add a new user?

1. Go to **Users** (`/admin/users`)
2. Click **"Add User"**
3. Enter:
   - Email (required)
   - Full name (required)
   - Role (Student, Instructor, Admin)
4. Click **Create**
5. User receives welcome email

### How do I bulk import users?

1. Go to **Users**
2. Click **"Bulk Import"**
3. Download the CSV template
4. Fill in: email, full_name, role
5. Upload the CSV
6. Review the preview
7. Click **Import**
8. See results (success/failure per user)

### How do I invite instructors?

1. Go to **Settings** (`/admin/settings`)
2. Find the **Instructor Agency Code**
3. Copy the code or the invite link
4. Share with the instructor
5. They register using the code
6. They're automatically added to your organization

### How do I deactivate a user?

1. Go to **Users**
2. Find the user
3. Click the toggle or **"Deactivate"**
4. User can no longer log in but data is preserved

---

## Admin: Organization Settings

### How do I update organization info?

1. Go to **Organization** (`/admin/organization`)
2. Edit:
   - Organization name
   - Website
   - Contact email/phone
   - Address
3. Click **Save**

### How do I customize branding?

1. Go to **Settings** → **Appearance** (`/admin/settings/appearance`)
2. Upload your logo
3. Set primary color
4. Configure portal name
5. Save

### How do I set up a custom domain?

1. Go to **Settings** → **Domains** (`/admin/settings/domains`)
2. Enter your custom domain (e.g., training.yourcompany.com)
3. Add the required DNS records
4. Verify the domain
5. Enable SSL

### How do I configure SSO?

1. Go to **Settings** → **SSO** (`/admin/settings/sso`)
2. Choose provider type:
   - SAML
   - OIDC
   - Google
   - Microsoft
3. Enter configuration details
4. Test the connection
5. Enable SSO

### How do I monitor storage usage?

1. Go to **Settings** → **Storage** (`/admin/settings/storage`)
2. View:
   - Total storage used
   - Storage by type (videos, documents, etc.)
   - Quota remaining
3. Upgrade if needed

---

## Admin: Billing & Subscriptions

### How do I view my subscription?

1. Go to **Billing** (`/admin/billing`)
2. See current plan and usage:
   - Instructors used / limit
   - Students used / limit
   - Storage used / limit

### How do I upgrade my plan?

1. Go to **Billing**
2. Click **"Upgrade Plan"**
3. Select new tier:
   - **Professional**: 5 instructors, 100 students, 25GB
   - **Institution**: Unlimited instructors, 500 students, 100GB
   - **Enterprise**: Custom limits, dedicated support
4. Enter payment details
5. Confirm

### What happens if I hit my limits?

- At 80%: Warning banner appears
- At 100%: Can't add more users/content
- Existing data is preserved
- Upgrade to continue adding

---

## Troubleshooting

### Why am I seeing a loading spinner that won't stop?

If you're stuck on a loading screen:
1. Wait 5 seconds - the system has a timeout
2. If still stuck, close the tab completely
3. Open a new tab and try again
4. If problem persists, clear browser cookies for this site

### Why can't students see my course?

Check that:
1. The course is **not archived**
2. The course dates are current (start date passed, end date not passed)
3. Students are **enrolled** in the course
4. The course is **published/active**

### Why can't I create more courses/users?

You may have hit your subscription limit:
1. Go to **Billing** to check usage
2. Upgrade your plan if needed
3. Or archive unused courses to free up slots

### Why isn't my quiz saving?

Ensure:
1. All required fields are filled (title, module)
2. At least one question is added
3. Each question has a correct answer marked
4. You clicked **Save** (not just the browser back button)

### How do I get help?

- Email: support@medicforge.net
- Documentation: This guide
- In-app: Click the **?** help icon

---

## Quick Reference

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save | Ctrl/Cmd + S |
| Search | Ctrl/Cmd + K |
| New | Ctrl/Cmd + N |

### URL Quick Links

| Feature | URL |
|---------|-----|
| Instructor Dashboard | `/instructor/dashboard` |
| My Courses | `/instructor/courses` |
| Grading | `/instructor/grading` |
| Question Bank | `/instructor/question-bank` |
| Exams | `/instructor/exams` |
| Students | `/instructor/students` |
| Analytics | `/instructor/analytics` |
| Admin Dashboard | `/admin/dashboard` |
| User Management | `/admin/users` |
| Organization | `/admin/organization` |
| Billing | `/admin/billing` |
| Settings | `/admin/settings` |

---

*Last updated: February 2026*
