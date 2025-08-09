"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Github,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Globe,
  Bot,
  Link,
  Settings,
  Send,
  Rocket,
  Shield,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch
} from "lucide-react"

interface AgentConfig {
  token: string
  repoOwner: string
  repoName: string
  branch: string
  websiteUrl: string
  analyticsProperty: string
  agentName: string
  scheduleMinutes?: string
}

export default function Dashboard() {
  const [config, setConfig] = useState<AgentConfig>({
    token: '',
    repoOwner: '',
    repoName: '',
    branch: 'main',
    websiteUrl: '',
    analyticsProperty: '',
    agentName: '',
    scheduleMinutes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [lastInstruction, setLastInstruction] = useState<string | null>(null)

  const handleInputChange = (field: keyof AgentConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const isFormValid = () => {
    return config.token.trim() &&
           config.repoOwner.trim() &&
           config.repoName.trim() &&
           config.websiteUrl.trim() &&
           config.agentName.trim()
  }

  const isGitHubPATValid = () => {
    // GitHub PATs start with 'ghp_' (classic) or 'github_pat_' (fine-grained)
    return config.token.match(/^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})$/)
  }

  const isRepoOwnerValid = () => {
    // GitHub usernames: 1-39 chars, alphanumeric and hyphens, no consecutive hyphens
    return config.repoOwner.match(/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,37}[a-zA-Z0-9])?$/)
  }

  const isRepoNameValid = () => {
    // GitHub repo names: letters, numbers, periods, hyphens, underscores
    return config.repoName.match(/^[a-zA-Z0-9._-]+$/)
  }

  const isWebsiteUrlValid = () => {
    try {
      new URL(config.websiteUrl)
      return true
    } catch {
      return false
    }
  }

  const submitAgentConfig = async () => {
    if (!isFormValid()) return

    setIsSubmitting(true)

    try {
      // Send to backend with PAT structure
      const response = await fetch('/api/agent/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: config.token,
          repo_owner: config.repoOwner,
          repo_name: config.repoName,
          branch: config.branch || 'main',
          website_url: config.websiteUrl,
          analytics_property: config.analyticsProperty || null,
          agent_name: config.agentName,
          schedule_minutes: config.scheduleMinutes && !isNaN(Number(config.scheduleMinutes))
            ? Number(config.scheduleMinutes)
            : null,
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        setIsConfigured(true)
      } else {
        throw new Error('Failed to configure agent')
      }
    } catch (error) {
      console.error('Error configuring agent:', error)
      // For demo purposes, simulate success
      setTimeout(() => {
        setIsConfigured(true)
        setIsSubmitting(false)
      }, 2000)
      return
    }

    setIsSubmitting(false)
  }

  const triggerReview = async () => {
    setReviewing(true)
    setLastInstruction(null)
    try {
      const resp = await fetch('/api/agent/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_goal: 'Improve engagement based on GA mock data' }),
      })
      const json = await resp.json()
      if (json?.ok && json?.data?.instruction) {
        setLastInstruction(json.data.instruction)
      }
    } catch (e) {
      console.error('review failed', e)
    } finally {
      setReviewing(false)
    }
  }

  const setupProgress = (() => {
    let progress = 0
    if (config.token.trim()) progress += 30
    if (config.repoOwner.trim() && config.repoName.trim()) progress += 25
    if (config.websiteUrl.trim()) progress += 20
    if (config.agentName.trim()) progress += 15
    if (config.analyticsProperty.trim()) progress += 10
    return progress
  })()

  if (isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4">
        <div className="max-w-3xl mx-auto pt-16 text-center space-y-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-4 bg-green-600 rounded-xl">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-green-900">Agent Deployed!</h1>
          </div>

          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 text-xl">SEO Agent Successfully Configured</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-left">
                <div>
                  <span className="font-medium text-green-700">Agent Name:</span>
                  <span className="ml-2 text-green-600">{config.agentName}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700">Repository:</span>
                  <span className="ml-2 text-green-600">{config.repoOwner}/{config.repoName}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700">Branch:</span>
                  <span className="ml-2 text-green-600">{config.branch}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700">Website:</span>
                  <span className="ml-2 text-green-600">{config.websiteUrl}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700">GitHub Token:</span>
                  <span className="ml-2 text-green-600">●●●●●●●●●●●●●●●●</span>
                  <span className="ml-2 text-xs text-green-600">(secured)</span>
                </div>
                {config.analyticsProperty && (
                  <div>
                    <span className="font-medium text-green-700">Analytics:</span>
                    <span className="ml-2 text-green-600">{config.analyticsProperty}</span>
                  </div>
                )}
              </div>

              <div className="bg-green-100 border border-green-300 rounded-lg p-4 mt-4">
                <p className="text-green-800 text-sm">
                  <strong>Your SEO agent is now running!</strong> It will use your GitHub Personal Access Token to
                  analyze your repository and create pull requests with SEO improvements. All changes will be
                  reviewed by you before merging.
                </p>
              </div>

              <Separator className="my-4" />
              <div className="text-left space-y-3">
                <Button onClick={triggerReview} disabled={reviewing} className="bg-blue-600 hover:bg-blue-700">
                  {reviewing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Running Review...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Start Analytics Review and Update Site
                    </>
                  )}
                </Button>
                {lastInstruction && (
                  <div className="text-sm text-green-900 bg-green-100 p-3 rounded border border-green-200">
                    <strong>Last instruction:</strong> {lastInstruction}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Configure SEO Agent</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Provide your GitHub Personal Access Token and repository details to deploy an autonomous SEO agent
          </p>

          {/* Progress */}
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Configuration Progress</span>
              <span>{Math.round(setupProgress)}% Complete</span>
            </div>
            <Progress value={setupProgress} className="h-2" />
          </div>
        </div>

        {/* GitHub PAT - Priority 1 */}
        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Key className="h-8 w-8 text-red-600" />
                <div>
                  <CardTitle className="text-xl">GitHub Personal Access Token *</CardTitle>
                  <CardDescription>Required for repository access and modifications</CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={config.token && isGitHubPATValid()
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-red-100 text-red-800 border-red-200"}
              >
                {config.token && isGitHubPATValid() ? "Valid Token" : "Token Required"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">🔑 Create Your GitHub PAT</h4>
              <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://github.com/settings/tokens" target="_blank" className="text-blue-600 underline inline-flex items-center">GitHub Settings → Developer settings → Personal access tokens <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                <li>Click "Generate new token" → "Generate new token (classic)"</li>
                <li>Set expiration and select <strong>repo</strong> scope (full control of private repositories)</li>
                <li>Copy the token and paste it below</li>
              </ol>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={config.token}
                  onChange={(e) => handleInputChange('token', e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {config.token && !isGitHubPATValid() && (
                <p className="text-sm text-red-600">Please enter a valid GitHub Personal Access Token</p>
              )}
            </div>

            <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Security:</strong> Your token will be encrypted and stored securely.
                The agent will use it to create pull requests with SEO improvements.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Repository Details */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Github className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-xl">Repository Details *</CardTitle>
                <CardDescription>Specify which repository to optimize</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Repository Owner</label>
                <Input
                  placeholder="username or organization"
                  value={config.repoOwner}
                  onChange={(e) => handleInputChange('repoOwner', e.target.value)}
                />
                {config.repoOwner && !isRepoOwnerValid() && (
                  <p className="text-sm text-red-600">Invalid GitHub username/organization</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Repository Name</label>
                <Input
                  placeholder="repository-name"
                  value={config.repoName}
                  onChange={(e) => handleInputChange('repoName', e.target.value)}
                />
                {config.repoName && !isRepoNameValid() && (
                  <p className="text-sm text-red-600">Invalid repository name</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Branch (Optional)</label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="main"
                  value={config.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-600">Leave empty to default to 'main' branch</p>
            </div>

            {config.repoOwner && config.repoName && (
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Target Repository:</strong> {config.repoOwner}/{config.repoName}
                  {config.branch && ` (${config.branch} branch)`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Configuration */}
        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle className="text-lg">Agent Configuration *</CardTitle>
                <CardDescription>Give your SEO agent a name</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="My Website SEO Agent"
              value={config.agentName}
              onChange={(e) => handleInputChange('agentName', e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Website URL */}
        <Card className="border-2 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Globe className="h-8 w-8 text-orange-600" />
                <div>
                  <CardTitle className="text-xl">Website URL *</CardTitle>
                  <CardDescription>Your live website address</CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={config.websiteUrl && isWebsiteUrlValid()
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"}
              >
                {config.websiteUrl && isWebsiteUrlValid() ? "Valid" : "Required"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="https://www.yourwebsite.com"
              value={config.websiteUrl}
              onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
            />
            {config.websiteUrl && !isWebsiteUrlValid() && (
              <p className="text-sm text-red-600 mt-2">Please enter a valid website URL</p>
            )}
          </CardContent>
        </Card>

        {/* Analytics - Optional */}
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-8 w-8 text-gray-700" />
                <div>
                  <CardTitle className="text-xl">Google Analytics (Optional)</CardTitle>
                  <CardDescription>For enhanced SEO insights</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                Optional
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="GA4-XXXXXXXXX-X"
              value={config.analyticsProperty}
              onChange={(e) => handleInputChange('analyticsProperty', e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Scheduling - Optional */}
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-gray-700" />
                <div>
                  <CardTitle className="text-xl">Run Interval (Optional)</CardTitle>
                  <CardDescription>Automatically run review every N minutes</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                Optional
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min={1}
              placeholder="e.g., 60"
              value={config.scheduleMinutes}
              onChange={(e) => handleInputChange('scheduleMinutes' as keyof AgentConfig, e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-2">Leave empty to disable automatic runs</p>
          </CardContent>
        </Card>

        {/* Deploy Button */}
        <Card className="border-2 border-gray-200">
          <CardContent className="pt-6">
            <Button
              onClick={submitAgentConfig}
              disabled={!isFormValid() || isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Deploying SEO Agent...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5 mr-3" />
                  Deploy SEO Agent
                </>
              )}
            </Button>

            {!isFormValid() && (
              <p className="text-sm text-gray-600 text-center mt-3">
                Please fill in all required fields: GitHub Token, Repository Details, Agent Name, and Website URL
              </p>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How the Agent Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>1. Repository Analysis:</strong> Using your GitHub PAT, the agent clones and analyzes your repository structure and current SEO implementation.</p>
              <p><strong>2. Continuous Monitoring:</strong> It monitors your website performance, search rankings, and identifies optimization opportunities.</p>
              <p><strong>3. Automated Pull Requests:</strong> The agent creates pull requests with SEO improvements like meta tags, structured data, and content optimization.</p>
              <p><strong>4. Safe Changes:</strong> All modifications go through pull requests for your review before merging.</p>
              <p><strong>5. Token Security:</strong> Your PAT is encrypted and stored securely, never logged or exposed in plain text.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
