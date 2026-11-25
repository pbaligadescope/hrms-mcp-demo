# Matrix MCP explainer v2: narration script

Voice: Michael (American English, Kokoro model, same voice as voice-generator.com). Runtime 4:00.

**0:00**  
Matrix Technologies is an HR and expenses portal. This is the story of how it gave an AI assistant access to its data, and how to do that safely, with Descope.

**0:13**  
Stage one. Employees sign in to the portal with Descope, using a magic link or a one-time code.

**0:21**  
There are three roles. Emma is an employee. Mark is a manager. And Hannah runs HR.

**0:28**  
Those roles and permissions live in Descope, and the portal checks them on every page, and on every change.

**0:36**  
Stage two. The team ships an MCP server, so assistants like Claude can use Matrix directly.

**0:44**  
But the server never asks who is calling. Ask it who you are, and the answer is: anonymous.

**0:51**  
So anyone who knows the URL can list every employee's salary, all the way up to the CEO.

**0:59**  
They can even change someone's pay. And the activity log can only say that somebody anonymous did it.

**1:09**  
Stage three. Same URL, but now Descope stands in front of it.

**1:15**  
When Claude connects, the person signs in with Descope first,

**1:20**  
and approves what Claude is allowed to do.

**1:23**  
Descope's access policy then decides which scopes go into the token, based on that person's role.

**1:31**  
The token belongs to one person, and the MCP server checks it on every call.

**1:37**  
Here's how that is set up in the Descope console.

**1:41** · Console: Agentic Identity Hub · MCP Servers  
First, the MCP server is registered in the Agentic Identity Hub, using the same local URL the app already serves.

**1:51** · Console: MCP server scopes  
It defines five scopes: profile, expenses, approvals, team salaries, and salaries. Each one has a plain-language description for the consent screen.

**2:03** · Console: Client registration and consent flow  
Dynamic client registration is on, so Claude can register itself. Sign-in runs through a custom consent flow.

**2:13** · Console: Flows · matrix-hr-consent  
That flow branches on the user's role, so each person sees a consent screen that matches what their role allows.

**2:21** · Console: Authorization · RBAC  
Under Authorization, the roles and permissions are the same ones the portal already uses: Employee, Manager, and HR Admin, each with its own set of permissions.

**2:40** · Console: Access Policy  
Finally, the access policy. There's one rule per role, plus a default rule at the bottom that blocks everything else. Each rule matches on the user's role,

**2:51** · Console: Access Policy · rule for Employees  
targets the Matrix MCP server, and lists exactly which scopes that role may receive. It applies to user access, and it's set to allow.

**3:06**  
Now, the same questions, asked as real people. Emma, an employee, asks what the CEO earns. Denied.

**3:14**  
But she can still file her own taxi expense.

**3:20**  
Mark is a manager. He can see the pay of his direct reports,

**3:25**  
but not anyone outside his team. Descope says what kind of access. The app decides whose records.

**3:32**  
Hannah, the HR admin, can see every salary,

**3:38**  
and she can change one. This time, the activity log records her name, along with every denied attempt.

**3:48**  
An MCP server is a new front door to your app. Give it the same identity and authorization as the rest of the app, with Descope.
