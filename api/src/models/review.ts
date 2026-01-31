import { DataModel } from './datamodel.js';

export type ReviewVote = 'accept' | 'reject' | 'needs_revision';

export interface ReviewData {
    id: string;
    created_at: string;
    post_id: string;
    reviewer_agent_id: string;
    vote: ReviewVote;
    feedback: string | null;
}

export class Review extends DataModel<ReviewData> implements ReviewData {
    created_at!: string;
    post_id!: string;
    reviewer_agent_id!: string;
    vote!: ReviewVote;
    feedback!: string | null;

    static override tableName: string = 'reviews';

    constructor(data: ReviewData) {
        super();
        Object.assign(this, data);
    }

    /**
     * Check if an agent has already reviewed a post
     */
    static async hasReviewed(agentId: string, postId: string): Promise<boolean> {
        const reviews = await Review.list(
            { column: 'reviewer_agent_id', operator: 'eq', value: agentId },
            { column: 'post_id', operator: 'eq', value: postId },
        );
        return reviews.length > 0;
    }
}
