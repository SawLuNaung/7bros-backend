# Add DevOps Collaborator to Repository

## Repository
**Repository:** `SawLuNaung/7bros-backend`  
**URL:** https://github.com/SawLuNaung/7bros-backend

## DevOps Information
**Email:** minnyinyiworkmail@gmail.com

---

## Method 1: GitHub Web Interface (Recommended)

### Steps:

1. **Go to the repository:**
   - Open: https://github.com/SawLuNaung/7bros-backend

2. **Navigate to Settings:**
   - Click on **"Settings"** tab (top right of repository page)

3. **Go to Collaborators:**
   - In the left sidebar, click **"Collaborators"** (under "Access")
   - If you don't see it, you may need to click **"Manage access"** first

4. **Add Collaborator:**
   - Click **"Add people"** button
   - Enter the email: `minnyinyiworkmail@gmail.com`
   - **OR** if they have a GitHub username, enter that instead
   - Select permission level: **"Write"** (allows push/pull, but not admin actions)
   - Click **"Add [username] to this repository"**

5. **Confirmation:**
   - The DevOps person will receive an email invitation
   - They need to accept the invitation to get access

---

## Method 2: Using GitHub CLI (If Authenticated)

If you're authenticated with GitHub CLI, you can try:

```bash
# First, check if the email corresponds to a GitHub username
# You may need to ask the DevOps person for their GitHub username

# Then add them using their username:
gh api \
  -X PUT \
  repos/SawLuNaung/7bros-backend/collaborators/USERNAME \
  -f permission=push
```

**Note:** The API requires the GitHub username, not email. You'll need to ask the DevOps person for their GitHub username, or they can create a GitHub account with that email first.

---

## Permission Levels

- **Read:** Can view and clone the repository
- **Write (Triage):** Can push code, create issues, manage issues
- **Write:** Can push code, create/manage issues and pull requests (Recommended for DevOps)
- **Maintain:** Can manage repository settings (except billing and deletion)
- **Admin:** Full access (including deletion)

**Recommended:** **Write** permission for DevOps (allows them to deploy code)

---

## After Adding

Once the DevOps person accepts the invitation, they can:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SawLuNaung/7bros-backend.git
   ```

2. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

3. **Deploy updates:**
   ```bash
   docker-compose build backend
   docker-compose restart backend
   ```

---

## Quick Link

**Direct link to add collaborator:**
https://github.com/SawLuNaung/7bros-backend/settings/access

(You need to be logged in and have admin access to the repository)
