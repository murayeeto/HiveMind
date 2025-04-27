import dsuCampusLocations from './dsuCampusLocations';
import morganStateCampusLocations from './morganStateCampusLocations';

export const colleges = [
    {
        id: 'dsu',
        name: 'Delaware State University'
    },
    {
        id: 'morgan',
        name: 'Morgan State University'
    }
];

export const getLocationsByCollege = (collegeId) => {
    switch (collegeId) {
        case 'dsu':
            return dsuCampusLocations;
        case 'morgan':
            return morganStateCampusLocations;
        default:
            return dsuCampusLocations; // Default to DSU
    }
};

export const getAllLocations = () => {
    return {
        dsu: dsuCampusLocations,
        morgan: morganStateCampusLocations
    };
};