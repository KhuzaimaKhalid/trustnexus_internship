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

module.exports = {
    createProject,
    getAllProjects,
    getProjectById
}