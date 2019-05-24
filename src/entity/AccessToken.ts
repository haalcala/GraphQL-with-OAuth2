import { Entity, ObjectIdColumn, ObjectID, Column, BaseEntity } from "typeorm";

@Entity("AccessTokens")
export class AccessToken extends BaseEntity {
	@ObjectIdColumn()
	id: ObjectID;

	@Column("text")
	userId: string;

	@Column("text")
	token: string;

	/**
	 * Ex: code
	 */
	@Column("text")
	grant_type: string;

	/** external sessionId */
	@Column("text")
	sessionId: string;

	@Column()
	createdAt: Date;

	@Column()
	updatedAt: Date;
}
