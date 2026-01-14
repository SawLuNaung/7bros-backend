const jwt = require("jsonwebtoken");
const {jwtSecretKey} = require("./config");

const authenticateUserToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization']
        const accessToken = authHeader && authHeader.split(' ')[1]
        if (!accessToken) {
            return res.status(403).json({
                message: "you need user token to access this resource",
                extensions: {
                    code: "UNAUTHORIZED"
                }
            })
        } else {
            const validatedUser = jwt.verify(accessToken, jwtSecretKey);
            req.user_id = validatedUser.user_id;
            req.role = validatedUser.role;
            if (validatedUser) {
                return next();
            }
        }
    } catch (err) {
        console.log(err)
        return res.status(401).json({
            message: "Invalid or expired user token",
            extensions: {
                code: "INVALID_TOKEN"
            }
        });
    }
};

const authenticateDriverToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization']
        const accessToken = authHeader && authHeader.split(' ')[1]
        if (!accessToken) {
            return res.status(403).json({
                message: "you need driver token to access this resource",
                extensions: {
                    code: "UNAUTHORIZED"
                }
            })
        } else {
            const validatedUser = jwt.verify(accessToken, jwtSecretKey);
            req.user_id = validatedUser.user_id;
            req.role = validatedUser.role;
            if (validatedUser) {
                return next();
            }
        }
    } catch (err) {
        console.log(err)
        return res.status(401).json({
            message: "Invalid or expired driver token",
            extensions: {
                code: "INVALID_TOKEN"
            }
        });
    }
};

const authenticateAdminToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization']
        const accessToken = authHeader && authHeader.split(' ')[1]
        if (!accessToken) {
            return res.status(403).json({
                message: "you need admin token to access this resource",
                extensions: {
                    code: "UNAUTHORIZED"
                }
            })
        } else {
            const validatedAdmin = jwt.verify(accessToken, jwtSecretKey);
            req.user_id = validatedAdmin.user_id;
            req.role = validatedAdmin.role;
            req.admin_role = validatedAdmin.admin_role; // Store admin_role for route-level checks
            if (validatedAdmin) {
                return next();
            }
        }
    } catch (err) {
        console.log(err)
        return res.status(401).json({
            message: "Invalid or expired admin token",
            extensions: {
                code: "INVALID_TOKEN"
            }
        });
    }
};

const authenticateSuperAdminToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization']
        const accessToken = authHeader && authHeader.split(' ')[1]
        
        if (!accessToken) {
            return res.status(403).json({
                message: "Admin token required",
                extensions: {
                    code: "UNAUTHORIZED"
                }
            })
        }
        
        const validated = jwt.verify(accessToken, jwtSecretKey);
        
        // Check if user has 'admin' role (full access)
        // Note: 'admin' is now the full-access role, 'staff' is limited
        if (validated.admin_role !== 'admin') {
            return res.status(403).json({
                message: "Admin access required for this operation",
                extensions: {
                    code: "FORBIDDEN"
                }
            })
        }
        
        req.user_id = validated.user_id;
        req.role = validated.role;
        req.admin_role = validated.admin_role;
        
        return next();
    } catch (err) {
        console.log(err)
        return res.status(401).json({
            message: "Invalid or expired token",
            extensions: {
                code: "INVALID_TOKEN"
            }
        });
    }
};



module.exports = {
    authenticateUserToken, 
    authenticateDriverToken, 
    authenticateAdminToken,
    authenticateSuperAdminToken  // Export new super admin middleware
};
