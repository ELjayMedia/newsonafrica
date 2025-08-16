import { JsonLd } from "@/components/JsonLd"

interface SchemaOrgProps {
  schemas: any[]
}

export function SchemaOrg({ schemas }: SchemaOrgProps) {
  return (
    <>
      {schemas.map((schema, index) => (
        <JsonLd key={index} data={schema} />
      ))}
    </>
  )
}
