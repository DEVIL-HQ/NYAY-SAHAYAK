import { Lawyer, ConnectionRequest, LawyerSpecialization } from './types';
import { MOCK_LAWYERS } from './constants';

// Simulated DB
let lawyers: Lawyer[] = [...MOCK_LAWYERS];
let connections: ConnectionRequest[] = [];

// Helper to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const LawyerAPI = {
    // Register a new lawyer
    registerLawyer: async (data: Omit<Lawyer, 'id' | 'isVerified' | 'wins' | 'losses' | 'rating' | 'feedbackCount' | 'image'>, profileImage?: File, idCard?: File): Promise<Lawyer> => {
        await delay(1500); // Simulate network

        // In a real app, we would upload files to storage here
        const newLawyer: Lawyer = {
            ...data,
            id: `l${Date.now()}`,
            isVerified: false, // Default to unverified until admin checks
            wins: 0,
            losses: 0,
            rating: 0,
            feedbackCount: 0,
            image: profileImage ? URL.createObjectURL(profileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
        };

        lawyers.push(newLawyer);
        // Persist to local storage for demo continuity
        localStorage.setItem('lawyers_db', JSON.stringify(lawyers));
        return newLawyer;
    },

    // Search lawyers with filters
    searchLawyers: async (filters?: { specialization?: LawyerSpecialization; query?: string }): Promise<Lawyer[]> => {
        await delay(800);
        let results = [...lawyers];

        if (filters?.specialization) {
            results = results.filter(l => l.specialization.includes(filters.specialization!));
        }

        if (filters?.query) {
            const q = filters.query.toLowerCase();
            results = results.filter(l =>
                l.name.toLowerCase().includes(q) ||
                l.court.toLowerCase().includes(q) ||
                l.bio?.toLowerCase().includes(q)
            );
        }

        return results;
    },

    // Connect with a lawyer
    connectWithLawyer: async (userId: string, lawyerId: string, message?: string): Promise<ConnectionRequest> => {
        await delay(1000);

        // Check if already connected
        const existing = connections.find(c => c.userId === userId && c.lawyerId === lawyerId);
        if (existing) return existing;

        const request: ConnectionRequest = {
            id: `conn_${Date.now()}`,
            userId,
            lawyerId,
            status: 'PENDING',
            timestamp: new Date(),
            message
        };

        connections.push(request);
        // In local storage
        localStorage.setItem('connections_db', JSON.stringify(connections));
        return request;
    },

    // Get lawyer by ID
    getLawyerById: async (id: string): Promise<Lawyer | undefined> => {
        await delay(500);
        return lawyers.find(l => l.id === id);
    },

    // Initialize simulated DB
    init: () => {
        const savedLawyers = localStorage.getItem('lawyers_db');
        if (savedLawyers) {
            lawyers = JSON.parse(savedLawyers);
        }
        const savedConns = localStorage.getItem('connections_db');
        if (savedConns) {
            connections = JSON.parse(savedConns);
        }
    }
};

// Initialize on load
LawyerAPI.init();
