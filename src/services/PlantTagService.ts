import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import { assertOnline, repositoryError } from '../data/SupabaseRepository'

export interface PlantTag {
  id: string
  name: string
}
export const normalizeTagNames = (names: string[]) => [
  ...new Set(names.map((name) => name.trim()).filter(Boolean)),
]

export class PlantTagService {
  async list(): Promise<PlantTag[]> {
    if (!isSupabaseConfigured) return []
    const { data, error } = await requireSupabase()
      .from('tags')
      .select('id, name')
      .order('name')
    if (error) throw repositoryError('tag read', error)
    return data ?? []
  }

  async prepare(add: string[], remove: string[]) {
    if (!isSupabaseConfigured)
      throw new Error('Plant tags require a connected cloud collection.')
    assertOnline()
    const client = requireSupabase()
    const { data: auth, error: authError } = await client.auth.getUser()
    if (authError || !auth.user)
      throw new Error('Sign in again before editing tags.')
    const userId = auth.user.id
    const tags = await this.list()
    const additions: string[] = []
    for (const name of normalizeTagNames(add)) {
      let tag = tags.find((tag) => tag.name === name)
      if (!tag) {
        const { data, error } = await client
          .from('tags')
          .insert({ user_id: userId, name })
          .select('id, name')
          .single()
        if (error && error.code !== '23505')
          throw repositoryError('tag creation', error)
        // A concurrent editor may have created this same owner/name pair.
        tag = data ?? (await this.list()).find((tag) => tag.name === name)
        if (!tag) throw new Error(`Could not find or create tag: ${name}`)
      }
      additions.push(tag.id)
    }
    const removals = tags
      .filter((tag) => normalizeTagNames(remove).includes(tag.name))
      .map((tag) => tag.id)
    return async (plantId: string) => {
      assertOnline()
      if (additions.length) {
        const { error } = await client.from('plant_tag_links').upsert(
          additions.map((tag_id) => ({
            user_id: userId,
            plant_id: plantId,
            tag_id,
          })),
          { onConflict: 'user_id,plant_id,tag_id', ignoreDuplicates: true },
        )
        if (error) throw repositoryError('tag assignment', error)
      }
      if (removals.length) {
        const { error } = await client
          .from('plant_tag_links')
          .delete()
          .eq('user_id', userId)
          .eq('plant_id', plantId)
          .in('tag_id', removals)
        if (error) throw repositoryError('tag removal', error)
      }
    }
  }
}
export const plantTagService = new PlantTagService()
