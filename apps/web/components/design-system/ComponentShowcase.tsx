/**
 * Component Showcase
 * Interactive examples and documentation for the design system components
 */

"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TypographyDisplayXL,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyLead,
  TypographyP,
  TypographyMuted,
  TypographyCode,
  TypographyBlockquote,
} from "@/components/ui/typography"
import { Container, Grid, Flex, NewsGrid, Section, Stack } from "@/components/ui/grid"
import { ChevronDown, Download, Heart, Share, Star } from "lucide-react"

export function ComponentShowcase() {
  return (
    <div className="min-h-screen bg-background">
      <Container size="xl">
        <Section size="lg">
          <Stack space={12}>
            {/* Header */}
            <div className="text-center">
              <TypographyDisplayXL className="mb-4">Design System Showcase</TypographyDisplayXL>
              <TypographyLead>
                A comprehensive collection of components, tokens, and utilities for the News On Africa platform
              </TypographyLead>
            </div>

            {/* Typography Section */}
            <Card>
              <CardHeader>
                <CardTitle>Typography System</CardTitle>
                <CardDescription>Semantic typography components with consistent styling</CardDescription>
              </CardHeader>
              <CardContent>
                <Stack space={6}>
                  <div>
                    <TypographyH3 className="mb-4">Display & Headings</TypographyH3>
                    <Stack space={4}>
                      <TypographyDisplayXL>Display Extra Large</TypographyDisplayXL>
                      <TypographyH1>Heading 1 - Main Article Title</TypographyH1>
                      <TypographyH2>Heading 2 - Section Title</TypographyH2>
                      <TypographyH3>Heading 3 - Subsection</TypographyH3>
                      <TypographyH4>Heading 4 - Minor Heading</TypographyH4>
                    </Stack>
                  </div>

                  <div>
                    <TypographyH3 className="mb-4">Body Text</TypographyH3>
                    <Stack space={4}>
                      <TypographyLead>
                        This is a lead paragraph that introduces the main content with emphasis and better readability.
                      </TypographyLead>
                      <TypographyP>
                        This is regular body text that provides the main content. It uses optimal line height and
                        spacing for comfortable reading across different devices and screen sizes.
                      </TypographyP>
                      <TypographyMuted>This is muted text used for secondary information and captions.</TypographyMuted>
                      <div>
                        Inline code example: <TypographyCode>const example = "Hello World"</TypographyCode>
                      </div>
                      <TypographyBlockquote>
                        "This is a blockquote that can be used for highlighting important quotes or testimonials from
                        articles and interviews."
                      </TypographyBlockquote>
                    </Stack>
                  </div>
                </Stack>
              </CardContent>
            </Card>

            {/* Button Components */}
            <Card>
              <CardHeader>
                <CardTitle>Button Components</CardTitle>
                <CardDescription>Interactive buttons with multiple variants and states</CardDescription>
              </CardHeader>
              <CardContent>
                <Stack space={6}>
                  <div>
                    <TypographyH4 className="mb-4">Button Variants</TypographyH4>
                    <Flex wrap gap={3}>
                      <Button variant="default">Default</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="success">Success</Button>
                      <Button variant="warning">Warning</Button>
                      <Button variant="info">Info</Button>
                      <Button variant="destructive">Destructive</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="link">Link</Button>
                      <Button variant="surface">Surface</Button>
                    </Flex>
                  </div>

                  <div>
                    <TypographyH4 className="mb-4">Button Sizes</TypographyH4>
                    <Flex align="center" gap={3}>
                      <Button size="sm">Small</Button>
                      <Button size="default">Default</Button>
                      <Button size="lg">Large</Button>
                      <Button size="xl">Extra Large</Button>
                    </Flex>
                  </div>

                  <div>
                    <TypographyH4 className="mb-4">Icon Buttons</TypographyH4>
                    <Flex gap={3}>
                      <Button size="icon">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="outline">
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button size="icon-lg" variant="success">
                        <Download className="h-4 w-4" />
                      </Button>
                    </Flex>
                  </div>

                  <div>
                    <TypographyH4 className="mb-4">Buttons with Icons</TypographyH4>
                    <Flex wrap gap={3}>
                      <Button>
                        <Download className="mr-2 h-4 w-4" />
                        Download Article
                      </Button>
                      <Button variant="outline">
                        <Share className="mr-2 h-4 w-4" />
                        Share Story
                      </Button>
                      <Button variant="success">
                        <Heart className="mr-2 h-4 w-4" />
                        Like Article
                      </Button>
                    </Flex>
                  </div>
                </Stack>
              </CardContent>
            </Card>

            {/* Badge Components */}
            <Card>
              <CardHeader>
                <CardTitle>Badge Components</CardTitle>
                <CardDescription>Status indicators and labels for categorization</CardDescription>
              </CardHeader>
              <CardContent>
                <Stack space={6}>
                  <div>
                    <TypographyH4 className="mb-4">Badge Variants</TypographyH4>
                    <Flex wrap gap={3}>
                      <Badge variant="default">Default</Badge>
                      <Badge variant="secondary">Secondary</Badge>
                      <Badge variant="success">Success</Badge>
                      <Badge variant="warning">Warning</Badge>
                      <Badge variant="info">Info</Badge>
                      <Badge variant="destructive">Destructive</Badge>
                      <Badge variant="outline">Outline</Badge>
                      <Badge variant="surface">Surface</Badge>
                      <Badge variant="muted">Muted</Badge>
                    </Flex>
                  </div>

                  <div>
                    <TypographyH4 className="mb-4">Badge Sizes</TypographyH4>
                    <Flex align="center" gap={3}>
                      <Badge size="sm">Small</Badge>
                      <Badge size="default">Default</Badge>
                      <Badge size="lg">Large</Badge>
                    </Flex>
                  </div>

                  <div>
                    <TypographyH4 className="mb-4">News Category Examples</TypographyH4>
                    <Flex wrap gap={2}>
                      <Badge variant="info">Politics</Badge>
                      <Badge variant="success">Business</Badge>
                      <Badge variant="warning">Sports</Badge>
                      <Badge variant="secondary">Entertainment</Badge>
                      <Badge variant="outline">Health</Badge>
                      <Badge variant="muted">Opinion</Badge>
                    </Flex>
                  </div>
                </Stack>
              </CardContent>
            </Card>

            {/* Card Components */}
            <Card>
              <CardHeader>
                <CardTitle>Card Components</CardTitle>
                <CardDescription>Flexible containers for content organization</CardDescription>
              </CardHeader>
              <CardContent>
                <Grid cols={2} gap={6}>
                  <Card variant="default">
                    <CardHeader>
                      <CardTitle size="sm">Default Card</CardTitle>
                      <CardDescription>Standard card with subtle shadow and border</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TypographyP>This is the default card variant used throughout the application.</TypographyP>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm">Read More</Button>
                    </CardFooter>
                  </Card>

                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle size="sm">Elevated Card</CardTitle>
                      <CardDescription>Enhanced card with more prominent shadow</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TypographyP>This elevated variant draws more attention to important content.</TypographyP>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm" variant="outline">
                        Learn More
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card variant="outlined">
                    <CardHeader>
                      <CardTitle size="sm">Outlined Card</CardTitle>
                      <CardDescription>Card with prominent border styling</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TypographyP>The outlined variant provides clear content separation.</TypographyP>
                    </CardContent>
                  </Card>

                  <Card variant="ghost">
                    <CardHeader>
                      <CardTitle size="sm">Ghost Card</CardTitle>
                      <CardDescription>Minimal card without background or border</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TypographyP>Ghost cards blend seamlessly with the background.</TypographyP>
                    </CardContent>
                  </Card>
                </Grid>
              </CardContent>
            </Card>

            {/* Tabs Components */}
            <Card>
              <CardHeader>
                <CardTitle>Tabs Components</CardTitle>
                <CardDescription>Navigation between related content sections</CardDescription>
              </CardHeader>
              <CardContent>
                <Stack space={6}>
                  <div>
                    <TypographyH4 className="mb-4">Default Tabs</TypographyH4>
                    <Tabs defaultValue="news" className="w-full">
                      <TabsList>
                        <TabsTrigger value="news">Latest News</TabsTrigger>
                        <TabsTrigger value="business">Business</TabsTrigger>
                        <TabsTrigger value="sports">Sports</TabsTrigger>
                        <TabsTrigger value="entertainment">Entertainment</TabsTrigger>
                      </TabsList>
                      <TabsContent value="news">
                        <TypographyP>Latest news content from across Africa.</TypographyP>
                      </TabsContent>
                      <TabsContent value="business">
                        <TypographyP>Business and economic news from African markets.</TypographyP>
                      </TabsContent>
                      <TabsContent value="sports">
                        <TypographyP>Sports coverage from across the continent.</TypographyP>
                      </TabsContent>
                      <TabsContent value="entertainment">
                        <TypographyP>Entertainment news and cultural content.</TypographyP>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div>
                    <TypographyH4 className="mb-4">Pills Variant</TypographyH4>
                    <Tabs defaultValue="trending" className="w-full">
                      <TabsList variant="pills">
                        <TabsTrigger variant="pills" value="trending">
                          Trending
                        </TabsTrigger>
                        <TabsTrigger variant="pills" value="popular">
                          Popular
                        </TabsTrigger>
                        <TabsTrigger variant="pills" value="recent">
                          Recent
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="trending">
                        <TypographyP>Trending articles and stories.</TypographyP>
                      </TabsContent>
                      <TabsContent value="popular">
                        <TypographyP>Most popular content this week.</TypographyP>
                      </TabsContent>
                      <TabsContent value="recent">
                        <TypographyP>Recently published articles.</TypographyP>
                      </TabsContent>
                    </Tabs>
                  </div>
                </Stack>
              </CardContent>
            </Card>

            {/* Dropdown Menu */}
            <Card>
              <CardHeader>
                <CardTitle>Dropdown Menu Components</CardTitle>
                <CardDescription>Contextual menus and action lists</CardDescription>
              </CardHeader>
              <CardContent>
                <Flex gap={4}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Article Actions
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Article Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Heart className="mr-2 h-4 w-4" />
                        Save Article
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share className="mr-2 h-4 w-4" />
                        Share Article
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Star className="mr-2 h-4 w-4" />
                        Rate Article
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        Categories
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>News Categories</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Politics</DropdownMenuItem>
                      <DropdownMenuItem>Business</DropdownMenuItem>
                      <DropdownMenuItem>Sports</DropdownMenuItem>
                      <DropdownMenuItem>Entertainment</DropdownMenuItem>
                      <DropdownMenuItem>Health</DropdownMenuItem>
                      <DropdownMenuItem>Technology</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Flex>
              </CardContent>
            </Card>

            {/* Grid System */}
            <Card>
              <CardHeader>
                <CardTitle>Grid System</CardTitle>
                <CardDescription>Responsive layout utilities and components</CardDescription>
              </CardHeader>
              <CardContent>
                <Stack space={6}>
                  <div>
                    <TypographyH4 className="mb-4">Responsive Grid</TypographyH4>
                    <Grid cols={3} gap={4}>
                      <Card variant="outlined">
                        <CardContent className="p-4">
                          <TypographyP>Grid Item 1</TypographyP>
                        </CardContent>
                      </Card>
                      <Card variant="outlined">
                        <CardContent className="p-4">
                          <TypographyP>Grid Item 2</TypographyP>
                        </CardContent>
                      </Card>
                      <Card variant="outlined">
                        <CardContent className="p-4">
                          <TypographyP>Grid Item 3</TypographyP>
                        </CardContent>
                      </Card>
                    </Grid>
                  </div>

                  <div>
                    <TypographyH4 className="mb-4">News Grid Layout</TypographyH4>
                    <NewsGrid>
                      <Card>
                        <CardHeader>
                          <Badge variant="info" className="w-fit mb-2">
                            Politics
                          </Badge>
                          <CardTitle size="sm">Breaking: Major Political Development</CardTitle>
                          <CardDescription>Latest updates from the political landscape...</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <Badge variant="success" className="w-fit mb-2">
                            Business
                          </Badge>
                          <CardTitle size="sm">Economic Growth Continues</CardTitle>
                          <CardDescription>African markets show positive trends...</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <Badge variant="warning" className="w-fit mb-2">
                            Sports
                          </Badge>
                          <CardTitle size="sm">Championship Finals This Weekend</CardTitle>
                          <CardDescription>Exciting matches scheduled across the continent...</CardDescription>
                        </CardHeader>
                      </Card>
                    </NewsGrid>
                  </div>

                  <div>
                    <TypographyH4 className="mb-4">Flex Layout</TypographyH4>
                    <Flex justify="between" align="center" className="p-4 bg-muted rounded-lg">
                      <div>
                        <TypographyH4>Article Title</TypographyH4>
                        <TypographyMuted>Published 2 hours ago</TypographyMuted>
                      </div>
                      <Flex gap={2}>
                        <Button size="sm" variant="outline">
                          Share
                        </Button>
                        <Button size="sm">Read More</Button>
                      </Flex>
                    </Flex>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Section>
      </Container>
    </div>
  )
}
