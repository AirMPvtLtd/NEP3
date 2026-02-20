/**
 * SWAGGER CONFIGURATION
 * API Documentation Setup using Swagger/OpenAPI
 * 
 * @module config/swagger
 */

/**
 * Swagger/OpenAPI Configuration
 * Defines API documentation structure
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'NEP Workbench API',
    version: '1.0.0',
    description: `
# NEP Workbench API Documentation

AI-powered educational platform aligned with India's National Education Policy (NEP) 2020.

## Features

- 🔐 **Multi-Role Authentication**: Admin, Teacher, Student, Parent
- 🎯 **AI Challenge Generation**: Mistral AI powered adaptive challenges
- 📊 **Performance Tracking**: 12 competency-based assessment
- 🧠 **Advanced Algorithms**: Kalman Filter, PID Controller, Meta-Learning
- 📈 **Real-time Analytics**: Comprehensive performance dashboards

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

- General API: 100 requests per 15 minutes
- Login endpoints: 5 attempts per 15 minutes
- Challenge generation: 3 requests per minute

## Error Handling

All endpoints return consistent error responses:

\`\`\`json
{
  "success": false,
  "message": "Error message",
  "error": "Error details (development only)"
}
\`\`\`

## Getting Started

1. Register as Admin (creates school)
2. Admin approves teachers
3. Teachers create student accounts
4. Students access learning platform

For more information, visit our [GitHub repository](https://github.com/nep-workbench).
    `,
    contact: {
      name: 'NEP Workbench Support',
      email: 'support@tryspyral.com',
      url: 'https://tryspyral.com'
    },
    license: {
      name: 'Proprietary',
      url: 'https://tryspyral.com/license'
    }
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://api.tryspyral.com'
        : 'http://localhost:3000',
      description: process.env.NODE_ENV === 'production' 
        ? 'Production Server' 
        : 'Development Server'
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'Admin',
      description: 'Admin-only endpoints for school management'
    },
    {
      name: 'Teacher',
      description: 'Teacher endpoints for class and student management'
    },
    {
      name: 'Student',
      description: 'Student endpoints for learning activities'
    },
    {
      name: 'Parent',
      description: 'Parent endpoints for monitoring child progress'
    },
    {
      name: 'Challenges',
      description: 'AI-powered challenge generation and submission'
    },
    {
      name: 'Analytics',
      description: 'Performance analytics and reporting'
    },
    {
      name: 'Health',
      description: 'System health check endpoints'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from login endpoint'
      }
    },
    schemas: {
      // Error Response
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Error message'
          },
          error: {
            type: 'string',
            example: 'Detailed error (development only)'
          }
        }
      },
      
      // Success Response
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operation successful'
          },
          data: {
            type: 'object',
            description: 'Response data'
          }
        }
      },
      
      // User Roles
      UserRole: {
        type: 'string',
        enum: ['admin', 'teacher', 'student', 'parent'],
        description: 'User role in the system'
      },
      
      // School
      School: {
        type: 'object',
        properties: {
          schoolId: {
            type: 'string',
            example: 'SCH-2025-00001'
          },
          schoolName: {
            type: 'string',
            example: 'Delhi Public School'
          },
          adminName: {
            type: 'string',
            example: 'Rajesh Kumar'
          },
          adminEmail: {
            type: 'string',
            format: 'email',
            example: 'admin@dps.edu'
          },
          schoolAddress: {
            type: 'string',
            example: '123 School Street, Delhi'
          },
          verified: {
            type: 'boolean',
            example: true
          }
        }
      },
      
      // Teacher
      Teacher: {
        type: 'object',
        properties: {
          teacherId: {
            type: 'string',
            example: 'TCH-00001'
          },
          name: {
            type: 'string',
            example: 'Amit Kumar'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'amit@dps.edu'
          },
          subjects: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['Physics', 'Mathematics']
          },
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
            example: 'approved'
          }
        }
      },
      
      // Student
      Student: {
        type: 'object',
        properties: {
          studentId: {
            type: 'string',
            example: 'STU-00001'
          },
          name: {
            type: 'string',
            example: 'Rahul Sharma'
          },
          class: {
            type: 'integer',
            example: 10
          },
          section: {
            type: 'string',
            example: 'A'
          },
          rollNumber: {
            type: 'integer',
            example: 1
          },
          performanceIndex: {
            type: 'number',
            format: 'float',
            example: 78.5
          }
        }
      },
      
      // Challenge
      Challenge: {
        type: 'object',
        properties: {
          challengeId: {
            type: 'string',
            example: 'CHL-1234567890'
          },
          simulationType: {
            type: 'string',
            example: 'physics'
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
            example: 'medium'
          },
          questions: {
            type: 'array',
            items: {
              type: 'object'
            }
          },
          score: {
            type: 'number',
            example: 85
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Authentication required'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'You do not have permission to access this resource'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Resource not found'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Validation error',
              errors: [
                'Email is required',
                'Password must be at least 8 characters'
              ]
            }
          }
        }
      },
      RateLimitError: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Too many requests. Please try again later.'
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

/**
 * Swagger Options
 */
const swaggerOptions = {
  swaggerDefinition,
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ]
};

module.exports = {
  swaggerDefinition,
  swaggerOptions
};