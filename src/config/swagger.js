const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SocaSob Backend API',
      version: '1.0.0',
      description: 'API Dokumentasi untuk SocaSob - Sistem Monitoring Kesehatan Mata',
      contact: {
        name: 'SocaSob Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server',
      },
    ],
    components: {
      schemas: {
        DailyLog: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'Tanggal log (YYYY-MM-DD)',
              example: '2026-07-10',
            },
            nearDuration: {
              type: 'number',
              description: 'Durasi dalam detik untuk jarak dekat',
              example: 3600,
            },
            farDuration: {
              type: 'number',
              description: 'Durasi dalam detik untuk jarak jauh',
              example: 7200,
            },
            blinkCount: {
              type: 'number',
              description: 'Jumlah kedipan mata',
              example: 1500,
            },
            eyeHealthStatus: {
              type: 'string',
              enum: ['normal', 'risk_myopia', 'risk_fatigue'],
              description: 'Status kesehatan mata',
              example: 'normal',
            },
            restCompliance: {
              type: 'number',
              description: 'Persentase kepatuhan istirahat (0-100)',
              example: 95,
            },
            sessions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  startTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Waktu mulai sesi',
                  },
                  endTime: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Waktu selesai sesi',
                  },
                  peakDistance: {
                    type: 'string',
                    enum: ['Dekat', 'Jauh'],
                    description: 'Jarak puncak selama sesi',
                  },
                },
              },
            },
          },
        },
        Settings: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID pengguna',
              example: 'default_user',
            },
            robotIp: {
              type: 'string',
              description: 'Alamat IP robot/ESP32-CAM',
              example: '192.168.1.100',
            },
            audioVolume: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Volume audio (0-100)',
              example: 50,
            },
            audioEnabled: {
              type: 'boolean',
              description: 'Status audio aktif/tidak',
              example: true,
            },
            notificationEnabled: {
              type: 'boolean',
              description: 'Status notifikasi aktif/tidak',
              example: true,
            },
          },
        },
        ResumeData: {
          type: 'object',
          properties: {
            myopiaRisk: {
              type: 'string',
              description: 'Tingkat risiko miopia',
              example: 'Rendah',
            },
            fatigueRisk: {
              type: 'string',
              description: 'Tingkat risiko kelelahan mata',
              example: 'Rendah',
            },
            avgDistance: {
              type: 'number',
              description: 'Jarak rata-rata (cm)',
              example: 35,
            },
            restCompliance: {
              type: 'number',
              description: 'Persentase kepatuhan istirahat',
              example: 95,
            },
            nearPercent: {
              type: 'number',
              description: 'Persentase waktu jarak dekat',
              example: 30,
            },
            farPercent: {
              type: 'number',
              description: 'Persentase waktu jarak jauh',
              example: 70,
            },
            totalHours: {
              type: 'number',
              description: 'Total jam pemakaian',
              example: 2.5,
            },
          },
        },
        RobotStatus: {
          type: 'object',
          properties: {
            ipAddress: {
              type: 'string',
              description: 'Alamat IP perangkat',
              example: '192.168.1.100',
            },
            macAddress: {
              type: 'string',
              description: 'Alamat MAC perangkat',
              example: '24:0A:C4:B3:52:1A',
            },
            rssi: {
              type: 'number',
              description: 'Kekuatan sinyal Wi-Fi (dBm)',
              example: -58,
            },
            firmwareVersion: {
              type: 'string',
              description: 'Versi firmware',
              example: 'v1.0.0-socasob',
            },
            status: {
              type: 'string',
              description: 'Status perangkat',
              example: 'active',
            },
          },
        },
        RobotHealth: {
          type: 'object',
          properties: {
            uptime: {
              type: 'string',
              description: 'Waktu aktif perangkat',
              example: '2d 4h 12m',
            },
            cpuTemperature: {
              type: 'number',
              description: 'Suhu CPU (Celcius)',
              example: 42.5,
            },
            wifiStrength: {
              type: 'string',
              description: 'Kekuatan sinyal Wi-Fi',
              example: 'Bagus (-58 dBm)',
            },
            fps: {
              type: 'number',
              description: 'Frame rate video',
              example: 24,
            },
            mlModelAccuracy: {
              type: 'number',
              description: 'Akurasi model ML (persentase)',
              example: 95.2,
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Status keberhasilan',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Pesan error',
              example: 'Log untuk tanggal 2026-07-10 tidak ditemukan',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Status keberhasilan',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Data yang dikembalikan',
            },
            message: {
              type: 'string',
              description: 'Pesan sukses',
              example: 'Pengaturan berhasil diperbarui',
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/*.js',
    './src/app.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
