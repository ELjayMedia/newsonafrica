const gql = String.raw

export const PENDING_COMMENTS_QUERY = gql`
  query PendingComments($first: Int!) {
    comments(
      first: $first
      where: { statusIn: HOLD, orderby: { field: COMMENT_DATE, order: DESC } }
    ) {
      nodes {
        databaseId
        content(format: RENDERED)
        date
        status
        author {
          node {
            name
          }
        }
        commentedOn {
          node {
            ... on DatabaseIdentifier {
              databaseId
            }
          }
        }
      }
    }
  }
`

export const APPROVE_COMMENT_MUTATION = gql`
  mutation ApproveComment($id: ID!) {
    updateComment(input: { id: $id, status: APPROVE }) {
      comment {
        databaseId
        content(format: RENDERED)
        date
        status
        author {
          node {
            name
          }
        }
        commentedOn {
          node {
            ... on DatabaseIdentifier {
              databaseId
            }
          }
        }
      }
    }
  }
`

export const DELETE_COMMENT_MUTATION = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(input: { id: $id, forceDelete: true }) {
      deletedId
      comment {
        databaseId
        content(format: RENDERED)
        date
        status
        author {
          node {
            name
          }
        }
        commentedOn {
          node {
            ... on DatabaseIdentifier {
              databaseId
            }
          }
        }
      }
    }
  }
`
