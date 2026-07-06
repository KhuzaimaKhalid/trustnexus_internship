const pool = require('../config/connectdb')

const createProject = async (req, res) => {
    const { title, description, start_date, end_date, pm_id, team_leads, members } = req.body;

    if (!title) {
        return res.status(400).json({ success: false, message: 'Project title is required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const projectQuery = `
      INSERT INTO projects (title, description, start_date, end_date, pm_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING project_id;
    `;
        const projectResult = await client.query(projectQuery, [title, description, start_date, end_date, pm_id]);
        const projectId = projectResult.rows[0].project_id;

        const assignments = [];

        if (Array.isArray(team_leads)) {
            team_leads.forEach(id => assignments.push({ userId: id, role: 'Team Lead' }));
        }
        if (Array.isArray(members)) {
            members.forEach(id => assignments.push({ userId: id, role: 'Intern' }));
        }

        if (assignments.length > 0) {
            const memberQuery = `
        INSERT INTO project_members (project_id, user_id, role_in_project)
        VALUES ${assignments.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(', ')};
      `;

            const memberValues = [projectId];
            assignments.forEach(asgn => {
                memberValues.push(asgn.userId, asgn.role);
            });

            await client.query(memberQuery, memberValues);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Project created successfully', projectId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating project:', error);
        res.status(500).json({ success: false, message: 'Database transaction error.' });
    } finally {
        client.release();
    }
};

const getAllProjects = async (req, res) => {
    try {
        const query = `
      SELECT p.project_id, p.title, p.status, p.start_date, p.end_date, u.name AS project_manager
      FROM projects p
      LEFT JOIN users u ON p.pm_id = u.user_id
      ORDER BY p.created_at DESC;
    `;
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ success: false, message: 'Server error while retrieving projects.' });
    }
};

const getProjectById = async (req, res) => {
    const loggedInUserId = req.user.user_id;

    try {
        const assignmentQuery = `
        SELECT project_id FROM project_members WHERE user_id = $1 LIMIT 1;
      `;
        const assignmentRes = await pool.query(assignmentQuery, [loggedInUserId]);

        if (assignmentRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'You are not currently assigned to any active project.'
            });
        }

        const projectId = assignmentRes.rows[0].project_id;

        const projectQuery = `
        SELECT p.*, u.name AS pm_name, u.email AS pm_email
        FROM projects p
        LEFT JOIN users u ON p.pm_id = u.user_id
        WHERE p.project_id = $1;
      `;
        const projectRes = await pool.query(projectQuery, [projectId]);
        const project = projectRes.rows[0];

        const membersQuery = `
        SELECT pm.user_id, u.name, u.email, pm.role_in_project
        FROM project_members pm
        JOIN users u ON pm.user_id = u.user_id
        WHERE pm.project_id = $1;
      `;
        const membersRes = await pool.query(membersQuery, [projectId]);

        const payload = {
            project_id: project.project_id,
            title: project.title,
            description: project.description,
            status: project.status,
            start_date: project.start_date,
            end_date: project.end_date,
            project_manager: project.pm_id ? { user_id: project.pm_id, name: project.pm_name, email: project.pm_email } : null,
            team_leads: membersRes.rows.filter(m => m.role_in_project === 'Team Lead'),
            members: membersRes.rows.filter(m => m.role_in_project === 'Intern')
        };

        res.status(200).json({ success: true, data: payload });
    } catch (error) {
        console.error('Error fetching project via JWT:', error);
        res.status(500).json({ success: false, message: 'Server error while parsing your project.' });
    }
};

// 1. UPDATE PROJECT DETAILS
const updateProject = async (req, res) => {
    const { id } = req.params; // Get project_id from URL
    const { title, description, start_date, end_date, status } = req.body;

    try {
        const query = `
            UPDATE projects 
            SET title = COALESCE($1, title), 
                description = COALESCE($2, description), 
                start_date = COALESCE($3, start_date), 
                end_date = COALESCE($4, end_date), 
                status = COALESCE($5, status)
            WHERE project_id = $6 AND is_deleted = false
            RETURNING *;
        `;
        const result = await pool.query(query, [title, description, start_date, end_date, status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found or already deleted.' });
        }

        res.status(200).json({ success: true, message: 'Project updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ success: false, message: 'Server error while updating project.' });
    }
};

// 2. DELETE PROJECT (SOFT DELETE)
const deleteProject = async (req, res) => {
    const { id } = req.params;

    try {
        // Instead of deleting the row, we toggle an 'is_deleted' flag to true
        const query = `
            UPDATE projects 
            SET is_deleted = true 
            WHERE project_id = $1 AND is_deleted = false
            RETURNING project_id;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found or already deleted.' });
        }

        res.status(200).json({ success: true, message: 'Project soft-deleted successfully.' });
    } catch (error) {
        console.error('Error soft-deleting project:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting project.' });
    }
};

// 3. ASSIGN USER ROLES TO AN EXISTING PROJECT
const assignProjectRole = async (req, res) => {
    const { id } = req.params; // project_id
    const { userId, role } = req.body; // role can be: 'Project Manager', 'Team Lead', or 'Intern'

    if (!userId || !role) {
        return res.status(400).json({ success: false, message: 'userId and role are required.' });
    }

    try {
        // If assigning a Project Manager, update the main projects table
        if (role === 'Project Manager') {
            const pmQuery = `
                UPDATE projects SET pm_id = $1 WHERE project_id = $2 AND is_deleted = false RETURNING *;
            `;
            const pmResult = await pool.query(pmQuery, [userId, id]);
            if (pmResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found.' });
            
            return res.status(200).json({ success: true, message: 'Project Manager assigned successfully.' });
        } 
        
        // If assigning a Team Lead or Intern, insert/update into project_members table
        if (role === 'Team Lead' || role === 'Intern') {
            const memberQuery = `
                INSERT INTO project_members (project_id, user_id, role_in_project)
                VALUES ($1, $2, $3)
                ON CONFLICT (project_id, user_id) 
                DO UPDATE SET role_in_project = EXCLUDED.role_in_project;
            `;
            await pool.query(memberQuery, [id, userId, role]);
            return res.status(200).json({ success: true, message: `${role} assigned successfully.` });
        }

        return res.status(400).json({ success: false, message: 'Invalid role specified.' });

    } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({ success: false, message: 'Server error while assigning role.' });
    }
};

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    assignProjectRole
}