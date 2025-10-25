# Component Catalog

This document highlights the major component groups that power the News On Africa interface. Use it as a starting point when you need to locate an existing UI pattern or decide where to add a new component.

## UI Primitives (`components/ui`)

Reusable building blocks derived from the design system. They cover common patterns such as buttons, form controls, feedback surfaces, and overlays.

- **Forms and Inputs**: `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, and the compound `field.tsx`/`input-group.tsx` helpers manage validation-ready form states.
- **Feedback and Messaging**: Alerts, badges, skeletons, spinners, and toast infrastructure (`alert.tsx`, `badge.tsx`, `skeleton.tsx`, `spinner.tsx`, `toast.tsx`/`toaster.tsx`).
- **Layout Utilities**: Cards, grids, tables, tabs, typography, and sidebar primitives provide consistent spacing and typography foundations across features.
- **Overlays & Interaction**: Dialogs, dropdown menus, popovers, sheets, and tooltips supply accessible layered experiences.

## Layout & Navigation

The top-level navigation system is composed of responsive headers (`SiteHeader.tsx`, `TopNavigation.tsx`, `BottomNavigation.tsx`) and supporting utilities such as `Navigation.tsx`, `Navbar.tsx`, and `CountryNavigation.tsx`. Mobile-specific behaviors live in `CompactMobileHeader.tsx`, `MobileProfileMenu.tsx`, and `navigation/MobileNavBase.tsx`.

Global layout structure, including the responsive shell and service worker registration, is centralized in `ClientLayoutComponents.tsx`, `ClientProviders.tsx`, `ResponsiveWrapper.tsx`, and `ServiceWorkerRegistration.tsx`.

## Content Presentation

- **Articles & Posts**: Components in `article/`, `posts/`, and the root (`ArticleView.tsx`, `PostContent.tsx`, `StyledPostContent.tsx`, `VerticalCard.tsx`) render editorial content, metadata, and schema markup (`SchemaOrg.tsx`, `StructuredData.tsx`, `ArticleJsonLd.tsx`).
- **Collections & Discovery**: `NewsGrid.tsx` with its skeleton variant, `FeaturedHero.tsx`, `FeaturedStory.tsx`, `SecondaryStories.tsx`, and `ArticleList.tsx` organize lists of stories for the home page and category views.
- **Skeletons & Loading States**: Dedicated skeletons (e.g., `HomePageSkeleton.tsx`, `CategoryPageSkeleton.tsx`, `PostSkeleton.tsx`) mirror final layouts while data loads.

## Engagement & Personalization

Interactive features that deepen user engagement are grouped alongside their UI primitives:

- **Accounts**: `ProfileDropdown.tsx`, `ProfileEditor.tsx`, and `ProfileContent.tsx` handle authenticated experiences; `ProtectedRoute.tsx` and `SessionStatus.tsx` guard access.
- **Bookmarks & Subscriptions**: `BookmarkButton.tsx`, `BookmarksContent.tsx`, `SubscribeContent.tsx`, and `SubscriptionsContent.tsx` manage saved content and premium flows.
- **Comments**: The full comment stack (`CommentForm.tsx`, `CommentList.tsx`, `CommentItem.tsx`, `CommentModeration.tsx`) coordinates Supabase-backed discussions.
- **Search**: `SearchBox.tsx`, `SearchForm.tsx`, `SearchContent.tsx`, and debugger utilities surface global search and diagnostics.

## Theming & Design Tokens

Theme primitives live in `design-system/` alongside `theme-provider.tsx`. These files wrap Radix UI color tokens, manage light/dark mode, and integrate typography decisions referenced throughout `components/ui`.

---

For testing references, explore `components/__tests__/` and co-located `*.test.tsx` files. They demonstrate typical rendering patterns and best practices when extending the component catalog.
