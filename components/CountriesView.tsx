import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, University, MapPin, GraduationCap, Award, X } from 'lucide-react';
import { masterService, scholarshipService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { MasterApplication, ScholarshipProgram, ScholarshipStatus } from '../types';

// Country flag emojis mapping
const COUNTRY_FLAGS: { [key: string]: string } = {
  'Italy': '🇮🇹',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Spain': '🇪🇸',
  'Netherlands': '🇳🇱',
  'United Kingdom': '🇬🇧',
  'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭',
  'Austria': '🇦🇹',
  'Belgium': '🇧🇪',
  'Denmark': '🇩🇰',
  'Norway': '🇳🇴',
  'Finland': '🇫🇮',
  'Poland': '🇵🇱',
  'Czech Republic': '🇨🇿',
  'Portugal': '🇵🇹',
  'Ireland': '🇮🇪',
  'Greece': '🇬🇷',
  'USA': '🇺🇸',
  'Canada': '🇨🇦',
  'Australia': '🇦🇺',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Singapore': '🇸🇬',
  'Turkey': '🇹🇷',
};

interface CountryData {
  country: string;
  flag: string;
  universityCount: number;
  applicationCount: number;
  applications: MasterApplication[];
}

interface UniversityData {
  universityName: string;
  location: string;
  applications: MasterApplication[];
  scholarshipPrograms: ScholarshipProgram[];
}

const CountriesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState<MasterApplication[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipProgram[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityData | null>(null);
  const [isUniversityModalOpen, setIsUniversityModalOpen] = useState(false);

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribeApps = masterService.subscribe(currentUser.uid, (data) => {
      setApplications(data);
    });

    const unsubscribeScholarships = scholarshipService.subscribe(currentUser.uid, (data) => {
      setScholarships(data);
    });

    return () => {
      unsubscribeApps();
      unsubscribeScholarships();
    };
  }, [currentUser?.uid]);

  // Extract country from location string (e.g., "Milan, Italy" -> "Italy")
  const extractCountry = (location: string): string => {
    if (!location) return 'Unknown';
    const parts = location.split(',').map(p => p.trim());
    return parts[parts.length - 1] || 'Unknown';
  };

  // Group applications by country
  const countriesData = useMemo<CountryData[]>(() => {
    const countryMap = new Map<string, MasterApplication[]>();

    applications.forEach(app => {
      const country = app.country || extractCountry(app.location || '');
      if (!countryMap.has(country)) {
        countryMap.set(country, []);
      }
      countryMap.get(country)!.push(app);
    });

    return Array.from(countryMap.entries())
      .map(([country, apps]) => {
        const uniqueUniversities = new Set(apps.map(a => a.university)).size;
        return {
          country,
          flag: COUNTRY_FLAGS[country] || '🌍',
          universityCount: uniqueUniversities,
          applicationCount: apps.length,
          applications: apps
        };
      })
      .sort((a, b) => b.applicationCount - a.applicationCount);
  }, [applications]);

  // Group applications by university within selected country
  const universitiesData = useMemo<UniversityData[]>(() => {
    if (!selectedCountry) return [];

    const countryApps = countriesData.find(c => c.country === selectedCountry)?.applications || [];
    const universityMap = new Map<string, MasterApplication[]>();

    countryApps.forEach(app => {
      if (!universityMap.has(app.university)) {
        universityMap.set(app.university, []);
      }
      universityMap.get(app.university)!.push(app);
    });

    return Array.from(universityMap.entries()).map(([universityName, apps]) => {
      // Find linked scholarships for this university
      const linkedScholarships = scholarships.filter(scholarship =>
        scholarship.linkedUniversities?.some(uni => uni.universityName === universityName)
      );

      return {
        universityName,
        location: apps[0].location || '',
        applications: apps,
        scholarshipPrograms: linkedScholarships
      };
    });
  }, [selectedCountry, countriesData, scholarships]);

  const getStatusColor = (status: ScholarshipStatus) => {
    switch (status) {
      case ScholarshipStatus.ACCEPTED:
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case ScholarshipStatus.APPLIED:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case ScholarshipStatus.REJECTED:
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusText = (status: ScholarshipStatus) => {
    return status.replace('_', ' ');
  };

  const getApplicationStatus = (app: MasterApplication): ScholarshipStatus => {
    if (app.isDone && app.isRejected) return ScholarshipStatus.REJECTED;
    if (app.isDone && !app.isRejected) return ScholarshipStatus.ACCEPTED;
    return ScholarshipStatus.APPLIED;
  };

  const handleCountryClick = (country: string) => {
    setSelectedCountry(country);
  };

  const handleBack = () => {
    setSelectedCountry(null);
  };

  // Stage 1: Country Selection
  if (!selectedCountry) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">🌍 Countries</h2>
          <span className="text-sm text-gray-400">
            ({countriesData.length} {countriesData.length === 1 ? 'country' : 'countries'})
          </span>
        </div>

        {/* Countries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {countriesData.map((countryData) => (
            <div
              key={countryData.country}
              onClick={() => handleCountryClick(countryData.country)}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all cursor-pointer group"
            >
              {/* Flag and Name */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{countryData.flag}</span>
                <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {countryData.country}
                </h3>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <University className="w-4 h-4 text-purple-400" />
                  <span>{countryData.universityCount} {countryData.universityCount === 1 ? 'University' : 'Universities'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  <span>{countryData.applicationCount} {countryData.applicationCount === 1 ? 'Application' : 'Applications'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {countriesData.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No applications yet. Applications will be grouped by country here.</p>
          </div>
        )}
      </div>
    );
  }

  // Stage 2: Universities in Selected Country
  const selectedCountryData = countriesData.find(c => c.country === selectedCountry);

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{selectedCountryData?.flag}</span>
          <div>
            <h2 className="text-2xl font-bold text-white">{selectedCountry}</h2>
            <p className="text-sm text-gray-400">
              {universitiesData.length} {universitiesData.length === 1 ? 'university' : 'universities'} • {selectedCountryData?.applicationCount} {selectedCountryData?.applicationCount === 1 ? 'application' : 'applications'}
            </p>
          </div>
        </div>
      </div>

      {/* Universities List */}
      <div className="space-y-4">
        {universitiesData.map((uni) => (
          <div
            key={uni.universityName}
            onClick={() => {
              setSelectedUniversity(uni);
              setIsUniversityModalOpen(true);
            }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-all cursor-pointer"
          >
            {/* University Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
                  <University className="w-5 h-5 text-purple-400" />
                  {uni.universityName}
                </h3>
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {uni.location}
                </p>
              </div>
              <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
                {uni.applications.length} {uni.applications.length === 1 ? 'app' : 'apps'}
              </span>
            </div>

            {/* Applications */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Programs Applied</h4>
              <div className="space-y-2">
                {uni.applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{app.program}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          app.type === 'Research' 
                            ? 'bg-purple-500/20 text-purple-300' 
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {app.type}
                        </span>
                        {app.deadline && (
                          <span className="text-xs text-gray-400">
                            Due: {new Date(app.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.isDone && (
                        <span className={`px-2 py-1 rounded text-xs border ${
                          app.isRejected 
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-green-500/20 text-green-300 border-green-500/30'
                        }`}>
                          {app.isRejected ? 'Rejected' : 'Done'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Scholarships */}
            {uni.scholarshipPrograms.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Available Scholarships ({uni.scholarshipPrograms.length})
                </h4>
                <div className="space-y-2">
                  {uni.scholarshipPrograms.map((scholarship) => {
                    const uniLink = scholarship.linkedUniversities?.find(
                      u => u.universityName === uni.universityName
                    );
                    
                    return (
                      <div
                        key={scholarship.id}
                        className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium">{scholarship.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {scholarship.type && (
                              <span className="text-xs text-blue-300">
                                {scholarship.type}
                              </span>
                            )}
                            {scholarship.fundingAmount && (
                              <span className="text-xs text-green-300">
                                {scholarship.fundingAmount}
                              </span>
                            )}
                            {scholarship.deadline && (
                              <span className="text-xs text-gray-400">
                                Due: {new Date(scholarship.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {uniLink && (
                          <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(uniLink.status)}`}>
                            {getStatusText(uniLink.status)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* University Detail Modal */}
      {isUniversityModalOpen && selectedUniversity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsUniversityModalOpen(false)}>
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <University className="w-6 h-6 text-purple-400" />
                  {selectedUniversity.universityName}
                </h3>
                <p className="text-gray-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {selectedUniversity.location}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsUniversityModalOpen(false);
                  setSelectedUniversity(null);
                }}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Applications */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Applications ({selectedUniversity.applications.length})
              </h4>
              <div className="space-y-3">
                {selectedUniversity.applications.map((app) => {
                  const status = getApplicationStatus(app);
                  const statusColor = getStatusColor(status);
                  
                  return (
                    <div
                      key={app.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="text-white font-semibold">{app.program}</h5>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              app.type === 'Research' 
                                ? 'bg-purple-500/20 text-purple-300' 
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {app.type}
                            </span>
                            {app.deadline && (
                              <span className="text-xs text-gray-400">
                                Deadline: {new Date(app.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                          {getStatusText(status)}
                        </span>
                      </div>

                      {/* Documents Progress */}
                      {app.documents && app.documents.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Documents</span>
                            <span>
                              {app.documents.filter(d => d.isCompleted).length}/{app.documents.length}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{
                                width: `${(app.documents.filter(d => d.isCompleted).length / app.documents.length) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {app.notes && (
                        <p className="text-sm text-gray-400 mt-2 bg-white/5 p-2 rounded">
                          {app.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Linked Scholarships */}
            {selectedUniversity.scholarshipPrograms.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Available Scholarships ({selectedUniversity.scholarshipPrograms.length})
                </h4>
                <div className="space-y-3">
                  {selectedUniversity.scholarshipPrograms.map((scholarship) => {
                    const uniLink = scholarship.linkedUniversities?.find(
                      u => u.universityName === selectedUniversity.universityName
                    );
                    
                    return (
                      <div
                        key={scholarship.id}
                        className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-white font-semibold">{scholarship.name}</h5>
                            <div className="flex items-center gap-3 mt-1">
                              {scholarship.type && (
                                <span className="text-xs text-blue-300">{scholarship.type}</span>
                              )}
                              {scholarship.fundingAmount && (
                                <span className="text-xs text-green-300">{scholarship.fundingAmount}</span>
                              )}
                              {scholarship.deadline && (
                                <span className="text-xs text-gray-400">
                                  Deadline: {new Date(scholarship.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {uniLink && (
                            <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(uniLink.status)}`}>
                              {getStatusText(uniLink.status)}
                            </span>
                          )}
                        </div>
                        {scholarship.description && (
                          <p className="text-sm text-gray-400 mt-2">{scholarship.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountriesView;
