import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import toast from 'react-hot-toast';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
  source: string;
  match_score?: number;
  posted_date?: string;
}

export function JobSearch() {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'relevance' | 'salary' | 'date'>('relevance');
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyNotes, setApplyNotes] = useState('');
  const queryClient = useQueryClient();
  const itemsPerPage = 10;

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['jobs', { keywords, location, jobType, minSalary, maxSalary }],
    queryFn: () =>
      apiClient.searchJobs({
        keywords,
        location: location || undefined,
        job_type: jobType || undefined,
        min_salary: minSalary ? parseInt(minSalary) : undefined,
        max_salary: maxSalary ? parseInt(maxSalary) : undefined,
      }),
    enabled: false,
  });

  const jobs = result?.data?.jobs || [];

  const createApplicationMutation = useMutation({
    mutationFn: (data: { job_id: string; status?: string; notes?: string; tags?: string[] }) =>
      apiClient.createApplication(data),
    onSuccess: () => {
      toast.success('Application created!');
      setShowApplyModal(false);
      setApplyNotes('');
      setApplyingJobId(null);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create application');
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keywords.trim()) {
      toast.error('Please enter job keywords');
      return;
    }

    setCurrentPage(1);
    setHasSearched(true);
    await refetch();
  };

  const sortedJobs = useMemo(() => {
    let sorted = [...jobs];
    
    switch (sortBy) {
      case 'salary':
        sorted.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
        break;
      case 'date':
        sorted.sort((a, b) => new Date(b.posted_date || 0).getTime() - new Date(a.posted_date || 0).getTime());
        break;
      case 'relevance':
      default:
        sorted.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    }
    
    return sorted;
  }, [jobs, sortBy]);

  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedJobs.slice(start, start + itemsPerPage);
  }, [sortedJobs, currentPage]);

  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);

  const toggleSaveJob = (jobId: string) => {
    const newSaved = new Set(savedJobs);
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId);
      toast.success('Removed from saved');
    } else {
      newSaved.add(jobId);
      toast.success('Saved for later!');
    }
    setSavedJobs(newSaved);
  };

  const handleApplyClick = (jobId: string) => {
    setApplyingJobId(jobId);
    setShowApplyModal(true);
  };

  const handleApplySubmit = async () => {
    if (!applyingJobId) return;
    
    createApplicationMutation.mutate({
      job_id: applyingJobId,
      status: 'applied',
      notes: applyNotes,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Section */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Job Search</h1>

          <form onSubmit={handleSearch} className="space-y-4">
            {/* Keywords and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords *
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g., Software Engineer, Data Scientist"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., San Francisco, Remote"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type
                </label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="">All Types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Salary
                </label>
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="$50000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Salary
                </label>
                <input
                  type="number"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  placeholder="$150000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Searching...' : 'Search Jobs'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setKeywords('');
                  setLocation('');
                  setJobType('');
                  setMinSalary('');
                  setMaxSalary('');
                  setHasSearched(false);
                }}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Searching for jobs...</p>
          </div>
        )}

        {hasSearched && !isLoading && jobs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">No jobs found matching your criteria</p>
            <p className="text-gray-500 mt-2">Try adjusting your search filters</p>
          </div>
        )}

        {jobs.length > 0 && (
          <>
            {/* Sort Controls */}
            <div className="mb-6 flex justify-between items-center">
              <p className="text-gray-600">
                Found <span className="font-bold text-indigo-600">{sortedJobs.length}</span> jobs
                {sortedJobs.length > itemsPerPage && (
                  <span className="text-sm text-gray-500 ml-2">
                    (Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedJobs.length)})
                  </span>
                )}
              </p>
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="relevance">Relevance</option>
                  <option value="salary">Highest Salary</option>
                  <option value="date">Most Recent</option>
                </select>
              </div>
            </div>

            {/* Jobs Grid */}
            <div className="space-y-4 mb-8">
              {paginatedJobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                        <button
                          onClick={() => toggleSaveJob(job._id)}
                          className={`p-1 rounded-lg transition ${
                            savedJobs.has(job._id)
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-400 hover:text-red-600'
                          }`}
                          title={savedJobs.has(job._id) ? 'Remove from saved' : 'Save job'}
                        >
                          <Heart size={20} fill={savedJobs.has(job._id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <p className="text-gray-600">{job.company}</p>
                    </div>
                    {job.match_score && (
                      <div className="flex flex-col items-center justify-center">
                        <div
                          className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full relative group"
                          title="Match score based on your profile"
                        >
                          <span className="text-white font-bold text-sm">{Math.round(job.match_score)}%</span>
                          <div className="hidden group-hover:block absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded p-2 whitespace-nowrap z-10">
                            Match score based on your skills & experience
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      📍 {job.location}
                    </span>
                    {job.job_type && (
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {job.job_type}
                      </span>
                    )}
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {job.source}
                    </span>
                    {job.posted_date && (
                      <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
                        {new Date(job.posted_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {(job.salary_min || job.salary_max) && (
                    <p className="text-gray-700 font-semibold mb-2 text-lg">
                      💰 {formatSalary(job.salary_min, job.salary_max)}
                    </p>
                  )}

                  {job.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {job.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplyClick(job._id)}
                      disabled={createApplicationMutation.isPending}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {createApplicationMutation.isPending ? 'Applying...' : 'Apply Now'}
                    </button>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium"
                    >
                      View Job →
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mb-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg font-medium ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Apply for Job</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={applyNotes}
                onChange={(e) => setApplyNotes(e.target.value)}
                placeholder="Why are you interested in this role?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplySubmit}
                disabled={createApplicationMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {createApplicationMutation.isPending ? 'Applying...' : 'Submit Application'}
              </button>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplyNotes('');
                  setApplyingJobId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return 'Not specified';
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (min) return `$${min.toLocaleString()}+`;
  return `Up to $${max?.toLocaleString()}`;
}
